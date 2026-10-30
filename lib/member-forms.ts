// The declaration and nominee forms, signed online in the member portal (brief Phase 2: "Declaration
// and nominee forms completed and signed online in the portal; stored as signed PDFs").
//
// A member signs by ticking the declarations and drawing a signature on screen. The site then
// prints the same form the welcome pack carries, with their signature, the date and their answers
// filled in, and stores that PDF encrypted alongside their ID documents. The latest signed nominee
// form replaces the nominee list on their record, as the form itself says it will.

import "server-only";

import { recordAudit } from "@/lib/audit";
import { saveDocument } from "@/lib/documents";
import { DECLARATION_STATEMENTS } from "@/lib/forms-text";
import { collections } from "@/lib/members";
import { buildDeclarationForm, buildNomineeForm, type NomineeRow } from "@/lib/pdf/pack-forms";
import { packMemberOf } from "@/lib/welcome-pack";

/** A drawn signature arrives as a PNG data URL. Anything else, or anything huge, is refused. */
const SIGNATURE_MAX_BYTES = 300 * 1024;

export function decodeSignature(dataUrl: unknown): Uint8Array | null {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) return null;
  const bytes = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  // A real PNG starts with these eight bytes; checking them stops anything else being embedded.
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 100 || bytes.length > SIGNATURE_MAX_BYTES || magic.some((b, i) => bytes[i] !== b)) return null;
  return new Uint8Array(bytes);
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export type FormResult = { ok: true } | { ok: false; error: string; status: number };

async function admittedMember(ref: string) {
  const { members } = await collections();
  const member = await members.findOne({ reference: ref });
  if (!member) return { error: "Please sign in again", status: 401 } as const;
  const pack = packMemberOf(member);
  if (!pack) return { error: "These forms open once your membership is approved", status: 409 } as const;
  return { member, pack } as const;
}

// ---------------- Declaration ----------------

/** Every statement on the client's form must be confirmed; there is nothing optional here. */
const DECLARATION_COUNT = DECLARATION_STATEMENTS.length;

export async function signDeclaration(ref: string, body: Record<string, unknown>): Promise<FormResult> {
  const found = await admittedMember(ref);
  if ("error" in found) return { ok: false, error: found.error ?? "", status: found.status ?? 400 };
  const { member, pack } = found;

  const agreed = Array.isArray(body.agreed) ? body.agreed : [];
  if (agreed.length !== DECLARATION_COUNT || !agreed.every((a) => a === true)) {
    return { ok: false, error: "Please confirm every statement before signing.", status: 422 };
  }
  const signerName = str(body.signerName, 120);
  if (signerName.length < 3) return { ok: false, error: "Type your full name.", status: 422 };
  const signature = decodeSignature(body.signature);
  if (!signature) return { ok: false, error: "Please draw your signature in the box.", status: 422 };
  const photoConsent = body.photoConsent === true;

  const signedAt = new Date();
  const pdf = await buildDeclarationForm(pack, { signature, signerName, signedAt, photoConsent });
  const documentId = await saveDocument({
    ownerRef: ref,
    type: "declaration",
    name: `Declaration ${pack.memberNo}.pdf`,
    contentType: "application/pdf",
    data: pdf,
  });

  const { members } = await collections();
  await members.updateOne(
    { reference: ref },
    { $set: { "forms.declaration": { signedAt, signerName, photoConsent, documentId }, updatedAt: signedAt } },
  );
  await recordAudit({
    action: "forms.declaration_signed",
    actor: `Member (${member.fullName})`,
    subject: pack.memberNo,
    detail: `Declaration signed online${photoConsent ? " · photo consent given" : ""}`,
    before: member.forms?.declaration ? "Signed before" : "Not returned",
    after: "Signed",
  });
  return { ok: true };
}

// ---------------- Nominee form ----------------

const MAX_NOMINEES = 5;

export async function signNomineeForm(ref: string, body: Record<string, unknown>): Promise<FormResult> {
  const found = await admittedMember(ref);
  if ("error" in found) return { ok: false, error: found.error ?? "", status: found.status ?? 400 };
  const { member, pack } = found;

  const raw = Array.isArray(body.nominees) ? body.nominees.slice(0, MAX_NOMINEES) : [];
  const nominees: NomineeRow[] = raw.map((n) => {
    const r = (n ?? {}) as Record<string, unknown>;
    return {
      name: str(r.name, 120),
      relationship: str(r.relationship, 60),
      phone: str(r.phone, 40),
      email: str(r.email, 120),
      address: str(r.address, 300),
      share: Math.round(Number(r.share) * 100) / 100,
    };
  });
  if (!nominees.length) return { ok: false, error: "Name at least one nominee.", status: 422 };
  for (const [i, n] of nominees.entries()) {
    if (n.name.length < 2) return { ok: false, error: `Nominee ${i + 1} needs a full name.`, status: 422 };
    if (!n.relationship) return { ok: false, error: `Say how nominee ${i + 1} is related to you.`, status: 422 };
    if (!n.phone && !n.email) return { ok: false, error: `Give a phone number or email for nominee ${i + 1}.`, status: 422 };
    if (!(n.share > 0)) return { ok: false, error: `Give nominee ${i + 1} a share above 0%.`, status: 422 };
  }
  const total = Math.round(nominees.reduce((t, n) => t + n.share, 0) * 100) / 100;
  if (total !== 100) return { ok: false, error: `Shares must total 100%. They total ${total}%.`, status: 422 };

  const witnessName = str(body.witnessName, 120);
  const witnessAddress = str(body.witnessAddress, 300);
  if (witnessName.length < 3) return { ok: false, error: "Type your witness's full name.", status: 422 };
  if (witnessAddress.length < 5) return { ok: false, error: "Give your witness's address.", status: 422 };
  // The form's own rule: "The witness must be 18 or over and must not be a nominee."
  const same = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, " ") === b.toLowerCase().replace(/\s+/g, " ");
  if (nominees.some((n) => same(n.name, witnessName))) {
    return { ok: false, error: "Your witness must not be one of your nominees.", status: 422 };
  }
  if (body.witnessAdult !== true) return { ok: false, error: "Confirm your witness is 18 or over.", status: 422 };

  const signature = decodeSignature(body.signature);
  if (!signature) return { ok: false, error: "Please draw your signature in the box.", status: 422 };
  const witnessSignature = decodeSignature(body.witnessSignature);
  if (!witnessSignature) return { ok: false, error: "Ask your witness to draw their signature in their box.", status: 422 };
  const survivorInstruction = str(body.survivorInstruction, 300);

  const signedAt = new Date();
  const pdf = await buildNomineeForm(pack, { signature, signedAt, nominees, survivorInstruction, witnessName, witnessAddress, witnessSignature });
  const documentId = await saveDocument({
    ownerRef: ref,
    type: "nominee_form",
    name: `Nominee form ${pack.memberNo}.pdf`,
    contentType: "application/pdf",
    data: pdf,
  });

  const { members } = await collections();
  await members.updateOne(
    { reference: ref },
    {
      $set: {
        "forms.nominee": { signedAt, documentId, nominees, survivorInstruction, witnessName, witnessAddress },
        // The latest signed form replaces the nominees on record, as the form says it will.
        nominees: nominees.map((n) => ({ name: n.name, relationship: n.relationship, contact: n.phone || n.email, share: n.share })),
        updatedAt: signedAt,
      },
    },
  );
  await recordAudit({
    action: "forms.nominee_signed",
    actor: `Member (${member.fullName})`,
    subject: pack.memberNo,
    detail: `Nominee form signed online — ${nominees.map((n) => `${n.name} ${n.share}%`).join(", ")} · witness ${witnessName}`,
    before: member.forms?.nominee ? "Signed before" : "Not returned",
    after: "Signed",
  });
  return { ok: true };
}
