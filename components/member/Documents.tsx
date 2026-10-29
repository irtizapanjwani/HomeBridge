"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, FileIcon, LockIcon } from "@/components/ui/Icons";
import { DocumentPicker, uploadDocument, type PickedFile } from "@/components/ui/DocumentPicker";
import { INFO_MESSAGE_MAX, type DocMeta } from "@/lib/document-types";
import { Card } from "./bits";

const btnPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-forest-800 px-7 text-[16px] font-semibold text-cream hover:bg-forest-900 disabled:opacity-60";

/**
 * Shown while an officer is waiting on the applicant (Email B, "More information needed"). The
 * applicant answers here rather than by email, so an ID copy never travels by email (brief p.6) and
 * the officer sees the answer on the application itself.
 */
export function InfoRequestCard({ needed, by }: { needed: string; by: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!message.trim() && !file) {
      setError("Add a message, a file, or both.");
      return;
    }
    setBusy(true);
    setError("");
    const problem = await uploadDocument("info", file, message.trim());
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="!border-gold/60 !bg-butter/40">
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">We need something from you</h2>
      <p className="mt-2 mb-0 text-[15px] text-body">To finish checking your application, the membership officer asked for:</p>
      <p className="mt-3 mb-0 rounded-xl bg-paper px-4 py-3 text-[15px] font-medium text-ink">{needed || "More information (see the email we sent you)."}</p>
      <p className="mt-3 mb-0 text-[14px] text-muted">Please send it by {by}.</p>

      <div className="mt-5 grid gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="infoMessage" className="text-[15px] font-semibold text-ink">
            Your message
          </label>
          <textarea
            id="infoMessage"
            rows={3}
            maxLength={INFO_MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="block w-full rounded-xl border border-line-strong/70 bg-page px-4 py-2.5 text-[16px] text-ink focus:border-forest-800 focus:outline-none"
          />
        </div>
        <DocumentPicker id="infoFile" label="Attach a file (optional)" hint="A photo or a PDF, up to 4 MB." value={file} onChange={setFile} />
      </div>

      {error && (
        <p role="alert" className="mt-4 mb-0 text-[14px] font-semibold text-danger">
          {error}
        </p>
      )}
      <button type="button" disabled={busy} onClick={() => void send()} className={`mt-5 ${btnPrimary}`}>
        {busy ? "Sending…" : "Send to HomeBridge"}
      </button>
      <p className="mt-4 mb-0 flex gap-2 text-[13px] text-muted">
        <LockIcon size={16} className="mt-0.5 shrink-0" />
        Files go to HomeBridge&rsquo;s private, encrypted storage. Please don&rsquo;t send ID documents by WhatsApp or email.
      </p>
    </Card>
  );
}

/**
 * The applicant's ID and proof of address (brief p.3). Lists what they have sent, and lets them add
 * whichever is missing while their application is still open — for example if an upload failed at
 * registration, or they registered before uploads existed.
 */
export function DocumentsCard({ documents, canUpload }: { documents: DocMeta[]; canUpload: boolean }) {
  const router = useRouter();
  const hasId = documents.some((d) => d.type === "id");
  const hasAddress = documents.some((d) => d.type === "address");
  const [idDoc, setIdDoc] = useState<PickedFile | null>(null);
  const [addressDoc, setAddressDoc] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const missing = canUpload && (!hasId || !hasAddress);
  if (!documents.length && !missing) return null;

  async function send() {
    if (!idDoc && !addressDoc) {
      setError("Choose a file first.");
      return;
    }
    setBusy(true);
    setError("");
    const problems = [
      idDoc ? await uploadDocument("id", idDoc) : null,
      addressDoc ? await uploadDocument("address", addressDoc) : null,
    ].filter(Boolean);
    setBusy(false);
    if (problems.length) {
      setError(problems[0]!);
      return;
    }
    setIdDoc(null);
    setAddressDoc(null);
    router.refresh();
  }

  return (
    <Card>
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Your documents</h2>
      {documents.length > 0 && (
        <ul className="mt-3 mb-0 flex list-none flex-col gap-2 p-0">
          {documents.map((d) => (
            <li key={d.id} className="flex items-start gap-2.5 text-[15px] text-body">
              <CheckIcon size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-forest-700" />
              <span>
                <span className="font-semibold text-ink">{d.label}</span> · {d.name}
                <span className="block text-[13px] text-muted">Received {d.uploadedAt}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {missing && (
        <div className="mt-5 grid gap-5">
          <p className="m-0 flex gap-2 text-[15px] text-body">
            <FileIcon size={18} className="mt-0.5 shrink-0 text-gold-ink" />
            We still need {!hasId && !hasAddress ? "your ID and your proof of address" : !hasId ? "your ID" : "your proof of address"} to check
            your application.
          </p>
          {!hasId && (
            <DocumentPicker
              id="portalIdDoc"
              label="Photo or scan of your ID"
              hint="Passport, national ID card, NIN slip or UK driving licence, with every corner in the picture."
              value={idDoc}
              onChange={setIdDoc}
            />
          )}
          {!hasAddress && (
            <DocumentPicker
              id="portalAddressDoc"
              label="Proof of address"
              hint="A utility bill, bank statement or tenancy agreement from the last 3 months."
              value={addressDoc}
              onChange={setAddressDoc}
            />
          )}
          {error && (
            <p role="alert" className="m-0 text-[14px] font-semibold text-danger">
              {error}
            </p>
          )}
          <button type="button" disabled={busy} onClick={() => void send()} className={`justify-self-start ${btnPrimary}`}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      )}
    </Card>
  );
}
