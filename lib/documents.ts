// Private, encrypted storage for applicants' ID documents and proof of address.
//
// Brief p.6 (Security): "ID documents in a private, encrypted storage bucket; access through
// short-lived signed links only, and only for vetting roles." and "Audit log of every view of an ID
// document". Brief p.5: a documents table with owner, type, storage path and uploaded_at.
//
// How that is met here:
//   * Files live in their own `documents` collection, never on the member record, so listing
//     applications never drags file bytes along.
//   * Each file is encrypted with AES-256-GCM before it is written, using DOCUMENTS_KEY, which lives
//     only in the host's environment. A database export, backup or a person with database access
//     sees ciphertext. GCM also detects any tampering with the stored bytes.
//   * There is no public URL. An officer gets a link that is signed and expires in five minutes,
//     and the route behind it also demands the admin session.
//   * Every view is written to the audit log before the file is served; if that write fails, the
//     file is not served.
//
// DOCUMENTS_KEY is 32 random bytes, base64-encoded:  openssl rand -base64 32
// Losing it makes every stored document unreadable, so keep a copy somewhere safe. Never change it
// once documents exist.

import "server-only";

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Binary, ObjectId } from "mongodb";

import { DOC_LABEL, type DocMeta, type DocType } from "@/lib/document-types";
import { collections } from "@/lib/members";

export type DocumentDoc = {
  _id?: ObjectId;
  /** The application reference the file belongs to. */
  ownerRef: string;
  type: DocType;
  /** The file name from the applicant's device, cleaned. Shown to officers; never trusted. */
  name: string;
  contentType: string;
  /** Size of the original file, before encryption. */
  bytes: number;
  /** AES-256-GCM: random 12-byte nonce, 16-byte authentication tag, and the ciphertext. */
  iv: Binary;
  tag: Binary;
  data: Binary;
  uploadedAt: Date;
  uploadedBy: "applicant";
};

const LINK_SECONDS = 5 * 60;

const LAGOS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function key(): Buffer {
  const raw = process.env.DOCUMENTS_KEY?.trim();
  if (!raw) throw new Error("DOCUMENTS_KEY is not set");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("DOCUMENTS_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)");
  return k;
}

/** True when uploads can be stored. Checked before accepting a file, so nothing is half-saved. */
export function isDocumentStorageConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

const bytesOf = (b: Binary | Uint8Array): Buffer =>
  Buffer.from(b instanceof Uint8Array ? b : (b as Binary).buffer);

function toMeta(d: DocumentDoc): DocMeta {
  return {
    id: String(d._id),
    type: d.type,
    label: DOC_LABEL[d.type],
    name: d.name,
    contentType: d.contentType,
    bytes: d.bytes,
    uploadedAt: LAGOS.format(d.uploadedAt),
  };
}

/** Encrypts and stores one file. Returns its id. */
export async function saveDocument(input: {
  ownerRef: string;
  type: DocType;
  name: string;
  contentType: string;
  data: Uint8Array;
}): Promise<string> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  // The owner and type are bound into the encryption, so a file cannot be quietly moved onto
  // another applicant's record: decrypting it there would fail.
  cipher.setAAD(Buffer.from(`${input.ownerRef}|${input.type}`));
  const encrypted = Buffer.concat([cipher.update(input.data), cipher.final()]);

  const { documents } = await collections();
  const res = await documents.insertOne({
    ownerRef: input.ownerRef,
    type: input.type,
    name: input.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 120) || "document",
    contentType: input.contentType,
    bytes: input.data.byteLength,
    iv: new Binary(iv),
    tag: new Binary(cipher.getAuthTag()),
    data: new Binary(encrypted),
    uploadedAt: new Date(),
    uploadedBy: "applicant",
  });
  return String(res.insertedId);
}

/** Metadata for every document belonging to these applications, newest first. No bytes. */
export async function listDocumentsFor(refs: string[]): Promise<Map<string, DocMeta[]>> {
  const out = new Map<string, DocMeta[]>();
  if (!refs.length) return out;
  const { documents } = await collections();
  const docs = await documents
    .find({ ownerRef: { $in: refs } }, { projection: { data: 0, iv: 0, tag: 0 } })
    .sort({ uploadedAt: -1 })
    .toArray();
  for (const d of docs) {
    const list = out.get(d.ownerRef) ?? [];
    list.push(toMeta(d as DocumentDoc));
    out.set(d.ownerRef, list);
  }
  return out;
}

/** One document, decrypted. Admin routes only, and only after the view has been audited. */
export async function readDocument(id: string): Promise<{ meta: DocMeta; ownerRef: string; bytes: Buffer } | null> {
  if (!ObjectId.isValid(id)) return null;
  const { documents } = await collections();
  const d = await documents.findOne({ _id: new ObjectId(id) });
  if (!d) return null;
  const decipher = createDecipheriv("aes-256-gcm", key(), bytesOf(d.iv));
  decipher.setAAD(Buffer.from(`${d.ownerRef}|${d.type}`));
  decipher.setAuthTag(bytesOf(d.tag));
  const bytes = Buffer.concat([decipher.update(bytesOf(d.data)), decipher.final()]);
  return { meta: toMeta(d), ownerRef: d.ownerRef, bytes };
}

/** Metadata for one document, without decrypting it. */
export async function findDocumentMeta(id: string): Promise<{ meta: DocMeta; ownerRef: string } | null> {
  if (!ObjectId.isValid(id)) return null;
  const { documents } = await collections();
  const d = await documents.findOne({ _id: new ObjectId(id) }, { projection: { data: 0, iv: 0, tag: 0 } });
  return d ? { meta: toMeta(d as DocumentDoc), ownerRef: d.ownerRef } : null;
}

/** Removes every document of one registration, when the registration itself is deleted. */
export async function deleteDocumentsFor(ref: string): Promise<number> {
  const { documents } = await collections();
  const res = await documents.deleteMany({ ownerRef: ref });
  return res.deletedCount;
}

// ---------- Short-lived signed links ----------

/** A separate key for signing links, derived from DOCUMENTS_KEY so there is nothing else to set. */
const linkKey = () => createHmac("sha256", key()).update("homebridge document view links").digest();

const sign = (payload: string) => createHmac("sha256", linkKey()).update(payload).digest("base64url");

/** A token that lets the signed-in officer open one document for the next five minutes. */
export function createViewToken(id: string): string {
  const expires = Math.floor(Date.now() / 1000) + LINK_SECONDS;
  return `${expires}.${sign(`${id}.${expires}`)}`;
}

export function verifyViewToken(id: string, token: string): boolean {
  const [expiresRaw, given] = token.split(".");
  const expires = Number(expiresRaw);
  if (!given || !Number.isFinite(expires) || expires * 1000 < Date.now()) return false;
  try {
    const expected = Buffer.from(sign(`${id}.${expires}`));
    const actual = Buffer.from(given);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
