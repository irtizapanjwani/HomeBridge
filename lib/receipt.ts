/** Shape of an uploaded payment receipt, as it travels from the form to the server. */
export type ReceiptUpload = {
  name: string;
  type: string;
  /** Base64 of the file's bytes, without a data: prefix. */
  data: string;
};

/** What a receipt may be. A phone screenshot or a bank's PDF covers everyone. */
export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"] as const;

/**
 * The largest stored receipt. Images are shrunk well below this in the browser before sending.
 *
 * Kept at 2.5MB because the file travels as base64 inside the registration's JSON, which inflates
 * it by a third, and Vercel rejects a request body over about 4.5MB before any of our code runs.
 * 2.5MB becomes roughly 3.4MB encoded, leaving room for the rest of the form.
 */
export const RECEIPT_MAX_BYTES = Math.round(2.5 * 1024 * 1024);

/** Base64 carries 3 bytes in every 4 characters, so the encoded form is about a third larger. */
export const RECEIPT_MAX_BASE64 = Math.ceil((RECEIPT_MAX_BYTES * 4) / 3) + 1024;

export const isReceiptType = (type: string) => (RECEIPT_TYPES as readonly string[]).includes(type);

export const prettyBytes = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`);
