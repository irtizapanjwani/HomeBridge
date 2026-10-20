"use client";

import { useRef, useState } from "react";
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES, isReceiptType, prettyBytes, type ReceiptUpload as Receipt } from "@/lib/receipt";

/** Longest edge of a stored screenshot. Large enough to read an amount and a reference. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let binary = "";
  // In chunks: one spread of a few million bytes overflows the call stack.
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
};

/**
 * Shrinks a photo or screenshot before upload. A modern phone screenshot is several megabytes,
 * which is slow on a Nigerian mobile connection and far more than is needed to read a receipt.
 * Anything that cannot be drawn (a PDF, or a format the browser will not decode) is sent as it is.
 */
async function shrink(file: File): Promise<{ data: string; type: string; bytes: number }> {
  const raw = await file.arrayBuffer();
  const asIs = { data: toBase64(raw), type: file.type, bytes: raw.byteLength };
  if (!file.type.startsWith("image/")) return asIs;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return asIs;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= raw.byteLength) return asIs;

    const shrunk = await blob.arrayBuffer();
    return { data: toBase64(shrunk), type: "image/jpeg", bytes: shrunk.byteLength };
  } catch {
    // HEIC on a browser that will not decode it, for one. The original still uploads.
    return asIs;
  }
}

/**
 * The payment receipt. Marked with an asterisk because the cooperative asks everyone for one, but
 * never blocks the form: someone whose phone will not cooperate must still be able to register,
 * and an officer can chase the receipt by email.
 */
export function ReceiptUpload({ value, onChange }: { value: Receipt | null; onChange: (v: Receipt | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [size, setSize] = useState(0);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError("");

    if (!isReceiptType(file.type)) {
      setError("Please upload a photo, screenshot or PDF of your receipt.");
      return;
    }

    setBusy(true);
    try {
      const { data, type, bytes } = await shrink(file);
      if (bytes > RECEIPT_MAX_BYTES) {
        setError(`That file is ${prettyBytes(bytes)}. Please upload one under ${prettyBytes(RECEIPT_MAX_BYTES)}.`);
        return;
      }
      setSize(bytes);
      onChange({ name: file.name.slice(0, 120), type, data });
    } catch {
      setError("We could not read that file. Please try another one.");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    onChange(null);
    setSize(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="receipt" className="text-[15px] font-semibold text-ink">
        Upload receipt or screenshot *
      </label>
      <p className="m-0 text-[13px] text-muted">
        A photo, screenshot or PDF of your payment, so we can match it to your registration quickly.
      </p>

      <input
        ref={inputRef}
        id="receipt"
        type="file"
        accept={RECEIPT_TYPES.join(",")}
        disabled={busy}
        onChange={(e) => void choose(e.target.files?.[0])}
        className="block w-full cursor-pointer rounded-xl border border-line bg-paper p-2.5 text-[14px] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-[13.5px] file:font-medium file:text-forest-800 disabled:opacity-60"
      />

      {busy && <p className="m-0 text-[13px] text-muted">Preparing your file…</p>}

      {value && !busy && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-mist px-3.5 py-2.5">
          <p className="m-0 min-w-0 truncate text-[13.5px] text-forest-800">
            {value.name}
            {size ? ` · ${prettyBytes(size)}` : ""}
          </p>
          <button type="button" onClick={clear} className="min-h-9 shrink-0 text-[13px] font-medium text-forest-800 underline underline-offset-[3px]">
            Remove
          </button>
        </div>
      )}

      {error && <p className="m-0 text-[13px] font-semibold text-danger">{error}</p>}
    </div>
  );
}
