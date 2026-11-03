import { NextResponse } from "next/server";

import { isCurrency } from "@/lib/contributions";
import { isDbConfigured } from "@/lib/db";
import { DOC_MAX_BYTES, isDocContentType } from "@/lib/document-types";
import { isDocumentStorageConfigured } from "@/lib/documents";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";
import { proofProblem, submitProof } from "@/lib/payment-proofs";

/**
 * A signed-in member sends proof of a contribution they paid: the amount, currency, month, date
 * paid, bank reference, and a photo or PDF of the bank receipt. The member is taken from their
 * session, never from the form.
 */
export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "Not available just now" }, { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "That upload could not be read" }, { status: 400 });
  }
  const text = (k: string) => (typeof form.get(k) === "string" ? String(form.get(k)).trim() : "");
  const currency = text("currency");
  if (!isCurrency(currency)) return NextResponse.json({ ok: false, error: "Choose the currency you paid in" }, { status: 422 });
  const input = {
    amount: Number(text("amount").replace(/[^\d.]/g, "")),
    currency,
    period: text("period"),
    paidOn: text("paidOn"),
    bankRef: text("bankRef"),
    note: text("note"),
  };
  const problem = proofProblem(input);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 422 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: "Attach a photo or PDF of the bank receipt" }, { status: 422 });
  if (!isDocContentType(file.type)) return NextResponse.json({ ok: false, error: "Please upload a photo or a PDF" }, { status: 415 });
  if (file.size > DOC_MAX_BYTES) return NextResponse.json({ ok: false, error: "That file is too large. Please upload one under 4 MB." }, { status: 413 });
  if (!isDocumentStorageConfigured()) {
    console.error("[proofs] DOCUMENTS_KEY is not set — a proof upload was refused.");
    return NextResponse.json({ ok: false, error: "Uploads are not available just now. Please try again later." }, { status: 503 });
  }

  try {
    const member = await findMemberByRef(ref);
    if (!member?.membership) return NextResponse.json({ ok: false, error: "Only members can send proof of a contribution" }, { status: 403 });
    await submitProof(member, input, { name: file.name, type: file.type, data: new Uint8Array(await file.arrayBuffer()) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[proofs] upload failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "We could not save that just now. Please try again." }, { status: 502 });
  }
}
