"use client";

import { useRef, useState } from "react";
import { DOC_CONTENT_TYPES, DOC_MAX_BYTES, isDocContentType, type DocType } from "@/lib/document-types";

/** A file chosen on the device, ready to send. Kept in memory only, never in saved form drafts. */
export type PickedFile = { name: string; type: string; blob: Blob; bytes: number };

/** Longest edge of a stored photo: plenty to read an ID card or a utility bill. */
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

const prettyBytes = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`);

/**
 * Shrinks a phone photo before upload: a modern photo is several megabytes, which is slow on a
 * mobile connection and far more than an officer needs to read a document. Anything that cannot be
 * drawn (a PDF, or HEIC on a browser that will not decode it) is sent as it is.
 */
async function shrink(file: File): Promise<PickedFile> {
  const asIs: PickedFile = { name: file.name, type: file.type, blob: file, bytes: file.size };
  if (!file.type.startsWith("image/")) return asIs;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return asIs;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return asIs;
    return { name: file.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", blob, bytes: blob.size };
  } catch {
    return asIs;
  }
}

/**
 * Sends one file (and optionally a message) to the signed-in applicant's own record.
 * Returns an error message to show, or null when it worked.
 */
export async function uploadDocument(type: DocType, picked: PickedFile | null, message?: string): Promise<string | null> {
  const form = new FormData();
  form.set("type", type);
  if (picked) form.set("file", new File([picked.blob], picked.name, { type: picked.type }));
  if (message) form.set("message", message);
  try {
    const res = await fetch("/api/member/documents", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return res.ok && data.ok ? null : data.error || "That could not be uploaded. Please try again.";
  } catch {
    return "We could not reach the server. Please try again.";
  }
}

/** One labelled file input that shrinks photos and checks type and size before anything is sent. */
export function DocumentPicker({
  id,
  label,
  hint,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  value: PickedFile | null;
  onChange: (v: PickedFile | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const shown = problem || error || "";

  async function choose(file: File | undefined) {
    if (!file) return;
    setProblem("");
    if (!isDocContentType(file.type)) {
      setProblem("Please choose a photo (JPG, PNG, WEBP, HEIC) or a PDF.");
      return;
    }
    setBusy(true);
    try {
      const picked = await shrink(file);
      if (picked.bytes > DOC_MAX_BYTES) {
        setProblem(`That file is ${prettyBytes(picked.bytes)}. Please choose one under ${prettyBytes(DOC_MAX_BYTES)}.`);
        return;
      }
      onChange(picked);
    } catch {
      setProblem("We could not read that file. Please try another one.");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    onChange(null);
    setProblem("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold text-ink">
        {label}
      </label>
      {hint && <p className="m-0 text-[13.5px] text-muted">{hint}</p>}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={DOC_CONTENT_TYPES.join(",")}
        disabled={busy}
        aria-invalid={!!shown}
        aria-describedby={shown ? `${id}-error` : undefined}
        onChange={(e) => void choose(e.target.files?.[0])}
        className="block w-full cursor-pointer rounded-xl border border-line bg-paper p-2.5 text-[14px] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-[13.5px] file:font-medium file:text-forest-800 disabled:opacity-60 aria-[invalid=true]:border-danger"
      />
      {busy && <p className="m-0 text-[13px] text-muted">Preparing your file…</p>}
      {value && !busy && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-mist px-3.5 py-2.5">
          <p className="m-0 min-w-0 truncate text-[13.5px] text-forest-800">
            {value.name} · {prettyBytes(value.bytes)}
          </p>
          <button type="button" onClick={clear} className="min-h-9 shrink-0 text-[13px] font-medium text-forest-800 underline underline-offset-[3px]">
            Remove
          </button>
        </div>
      )}
      {shown && (
        <p id={`${id}-error`} className="m-0 text-[13px] font-semibold text-danger">
          {shown}
        </p>
      )}
    </div>
  );
}
