"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, FileIcon } from "@/components/ui/Icons";
import { DECLARATION_STATEMENTS, PHOTO_CONSENT } from "@/lib/forms-text";
import { Card } from "./bits";
import { SignaturePad } from "./SignaturePad";

export type FormsView = {
  dueBy: string;
  memberName: string;
  declaration?: { signedAt: string; documentId: string };
  nominee?: { signedAt: string; documentId: string };
  /** Pre-fills the online nominee form: the last signed list, or the nominees given at registration. */
  nomineeDefaults: NomineeInput[];
};

type NomineeInput = { name: string; relationship: string; phone: string; email: string; address: string; share: string };

const btnPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-forest-800 px-7 text-[16px] font-semibold text-cream hover:bg-forest-900 disabled:opacity-60";
const btnSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-forest-800/30 bg-paper px-5 text-[15px] font-semibold text-ink hover:border-forest-800";
const input =
  "block min-h-11 w-full rounded-xl border border-line-strong/70 bg-page px-3.5 py-2 text-[16px] text-ink focus:border-forest-800 focus:outline-none";

async function send(path: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return res.ok && d.ok ? null : d.error || `That did not work (error ${res.status}).`;
  } catch {
    return "We could not reach the server. Please try again.";
  }
}

/**
 * Brief Phase 2: "Declaration and nominee forms completed and signed online in the portal; stored as
 * signed PDFs". Shown once a member is admitted. Each form can be signed again later — a new nominee
 * form replaces the old one, as the form itself says.
 */
export function FormsCard({ forms }: { forms: FormsView }) {
  const [open, setOpen] = useState<null | "declaration" | "nominee">(null);
  const outstanding = [!forms.declaration && "declaration", !forms.nominee && "nominee form"].filter(Boolean) as string[];

  return (
    <Card className={outstanding.length ? "!border-gold/60" : ""}>
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Your membership forms</h2>
      <p className="mt-2 mb-0 text-[15px] text-body">
        {outstanding.length
          ? `Please sign your ${outstanding.join(" and ")} by ${forms.dueBy}. You can do it here — no printing needed.`
          : "Both forms are signed. Thank you. You can change your nominees at any time by signing a new nominee form."}
      </p>

      <ul className="mt-4 mb-0 flex list-none flex-col gap-3 p-0">
        <FormRow
          title="Member Declaration Form"
          done={forms.declaration}
          onOpen={() => setOpen(open === "declaration" ? null : "declaration")}
          openLabel={forms.declaration ? "Sign again" : "Read and sign"}
        />
        <FormRow
          title="Nominee (Next of Kin) Form"
          done={forms.nominee}
          onOpen={() => setOpen(open === "nominee" ? null : "nominee")}
          openLabel={forms.nominee ? "Change nominees" : "Fill in and sign"}
        />
      </ul>

      {open === "declaration" && <DeclarationForm memberName={forms.memberName} onDone={() => setOpen(null)} />}
      {open === "nominee" && <NomineeForm defaults={forms.nomineeDefaults} onDone={() => setOpen(null)} />}
    </Card>
  );
}

function FormRow({ title, done, onOpen, openLabel }: { title: string; done?: { signedAt: string; documentId: string }; onOpen: () => void; openLabel: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
      <span className="flex min-w-0 items-start gap-2.5">
        {done ? <CheckIcon size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-forest-700" /> : <FileIcon size={18} className="mt-0.5 shrink-0 text-gold-ink" />}
        <span>
          <span className="block text-[15px] font-semibold text-ink">{title}</span>
          <span className="block text-[13.5px] text-muted">{done ? `Signed ${done.signedAt}` : "Not signed yet"}</span>
        </span>
      </span>
      <span className="flex flex-wrap gap-2">
        {done ? (
          <a href={`/api/member/documents/${encodeURIComponent(done.documentId)}`} target="_blank" rel="noopener" className={btnSecondary}>
            Download signed copy
          </a>
        ) : null}
        <button type="button" onClick={onOpen} className={btnSecondary}>
          {openLabel}
        </button>
      </span>
    </li>
  );
}

function DeclarationForm({ memberName, onDone }: { memberName: string; onDone: () => void }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState<boolean[]>(DECLARATION_STATEMENTS.map(() => false));
  const [photoConsent, setPhotoConsent] = useState(false);
  const [signerName, setSignerName] = useState(memberName);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!agreed.every(Boolean)) return setError("Please tick every statement before signing.");
    if (signerName.trim().length < 3) return setError("Type your full name.");
    if (!signature) return setError("Please draw your signature in the box.");
    setBusy(true);
    setError("");
    const problem = await send("/api/member/forms/declaration", { agreed, photoConsent, signerName, signature });
    setBusy(false);
    if (problem) return setError(problem);
    onDone();
    router.refresh();
  }

  return (
    <div className="mt-5 grid gap-5 border-t border-line pt-5">
      <p className="m-0 text-[15px] font-semibold text-ink">I declare that:</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {DECLARATION_STATEMENTS.map((s, i) => (
          <li key={s}>
            <label className="flex cursor-pointer gap-3 text-[15px] leading-relaxed text-body">
              <input
                type="checkbox"
                checked={agreed[i]}
                onChange={(e) => setAgreed((cur) => cur.map((v, j) => (j === i ? e.target.checked : v)))}
                className="mt-1 size-5 shrink-0 accent-forest-800"
              />
              <span>
                <span className="font-semibold text-forest-800">{i + 1}.</span> {s}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <label className="flex cursor-pointer gap-3 rounded-xl bg-mist/60 px-3.5 py-3 text-[15px] text-body">
        <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} className="mt-1 size-5 shrink-0 accent-forest-800" />
        <span>
          <span className="font-semibold text-ink">Optional:</span> {PHOTO_CONSENT}
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-ink">
        Your full name
        <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className={input} autoComplete="name" />
      </label>
      <SignaturePad id="decl-sig" label="Your signature" onChange={setSignature} />
      {error && (
        <p role="alert" className="m-0 text-[14px] font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => void submit()} className={btnPrimary}>
          {busy ? "Signing…" : "Sign declaration"}
        </button>
        <button type="button" onClick={onDone} className={btnSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const emptyNominee = (): NomineeInput => ({ name: "", relationship: "", phone: "", email: "", address: "", share: "" });

function NomineeForm({ defaults, onDone }: { defaults: NomineeInput[]; onDone: () => void }) {
  const router = useRouter();
  const [nominees, setNominees] = useState<NomineeInput[]>(defaults.length ? defaults : [{ ...emptyNominee(), share: "100" }]);
  const [survivorInstruction, setSurvivorInstruction] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [witnessAddress, setWitnessAddress] = useState("");
  const [witnessAdult, setWitnessAdult] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [witnessSignature, setWitnessSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = Math.round(nominees.reduce((t, n) => t + (Number(n.share) || 0), 0) * 100) / 100;
  const set = (i: number, patch: Partial<NomineeInput>) => setNominees((cur) => cur.map((n, j) => (j === i ? { ...n, ...patch } : n)));

  async function submit() {
    if (total !== 100) return setError(`Shares must total 100%. They total ${total}%.`);
    if (!signature) return setError("Please draw your signature in your box.");
    if (!witnessSignature) return setError("Ask your witness to sign in their box.");
    setBusy(true);
    setError("");
    const problem = await send("/api/member/forms/nominee", {
      nominees: nominees.map((n) => ({ ...n, share: Number(n.share) })),
      survivorInstruction,
      witnessName,
      witnessAddress,
      witnessAdult,
      signature,
      witnessSignature,
    });
    setBusy(false);
    if (problem) return setError(problem);
    onDone();
    router.refresh();
  }

  return (
    <div className="mt-5 grid gap-5 border-t border-line pt-5">
      <p className="m-0 text-[15px] text-body">
        In the event of my death, I nominate the person(s) below to receive my shares and any sums due to me from HomeBridge Cooperative, subject
        to the Bye-laws and applicable law.
      </p>

      {nominees.map((n, i) => (
        <fieldset key={i} className="m-0 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
          <legend className="px-1 text-[14px] font-semibold text-forest-800">Nominee {i + 1}</legend>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            Full name
            <input value={n.name} onChange={(e) => set(i, { name: e.target.value })} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            Relationship to you
            <input value={n.relationship} onChange={(e) => set(i, { relationship: e.target.value })} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            Phone
            <input value={n.phone} onChange={(e) => set(i, { phone: e.target.value })} className={input} inputMode="tel" />
          </label>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            Email
            <input value={n.email} onChange={(e) => set(i, { email: e.target.value })} className={input} inputMode="email" />
          </label>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink sm:col-span-2">
            Address
            <input value={n.address} onChange={(e) => set(i, { address: e.target.value })} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            Share (%)
            <input value={n.share} onChange={(e) => set(i, { share: e.target.value.replace(/[^\d.]/g, "") })} className={input} inputMode="decimal" />
          </label>
          {nominees.length > 1 ? (
            <button
              type="button"
              onClick={() => setNominees((cur) => cur.filter((_, j) => j !== i))}
              className="self-end justify-self-start text-[14px] font-medium text-danger underline underline-offset-[3px]"
            >
              Remove nominee {i + 1}
            </button>
          ) : null}
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {nominees.length < 5 ? (
          <button type="button" onClick={() => setNominees((cur) => [...cur, emptyNominee()])} className={btnSecondary}>
            Add another nominee
          </button>
        ) : (
          <span />
        )}
        <span className={`text-[15px] font-semibold ${total === 100 ? "text-forest-800" : "text-danger"}`}>Total: {total}%</span>
      </div>

      <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-ink">
        If a nominee dies before me, their share is divided equally among the remaining nominees unless I say otherwise here (optional)
        <input value={survivorInstruction} onChange={(e) => setSurvivorInstruction(e.target.value)} className={input} />
      </label>

      <SignaturePad id="nom-sig" label="Your signature" onChange={setSignature} />

      <fieldset className="m-0 grid gap-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-[14px] font-semibold text-forest-800">Witness</legend>
        <p className="m-0 text-[14px] text-muted">Your witness must be 18 or over, must not be one of your nominees, and signs on this screen with you.</p>
        <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
          Witness full name
          <input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
          Witness address
          <input value={witnessAddress} onChange={(e) => setWitnessAddress(e.target.value)} className={input} />
        </label>
        <label className="flex cursor-pointer gap-3 text-[15px] text-body">
          <input type="checkbox" checked={witnessAdult} onChange={(e) => setWitnessAdult(e.target.checked)} className="mt-1 size-5 shrink-0 accent-forest-800" />
          My witness is 18 or over and is not one of my nominees.
        </label>
        <SignaturePad id="wit-sig" label="Witness signature" onChange={setWitnessSignature} />
      </fieldset>

      {error && (
        <p role="alert" className="m-0 text-[14px] font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => void submit()} className={btnPrimary}>
          {busy ? "Signing…" : "Sign nominee form"}
        </button>
        <button type="button" onClick={onDone} className={btnSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}
