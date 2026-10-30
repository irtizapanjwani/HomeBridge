import { NextResponse } from "next/server";

import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/lib/db";
import { DOC_LABEL, DOC_MAX_BYTES, INFO_MESSAGE_MAX, UPLOADABLE_DOC_TYPES, isDocContentType, isDocType } from "@/lib/document-types";
import { isDocumentStorageConfigured, saveDocument } from "@/lib/documents";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";
import { type MemberStatus, collections } from "@/lib/members";

/** An applicant can add ID and proof of address while their application is still being decided. */
const OPEN: MemberStatus[] = ["Submitted", "In review", "Info requested"];

/**
 * Receives one file (and, for a response to an information request, a message) from a signed-in
 * applicant. One file per request keeps every request under the host's body size limit.
 *
 *   type=id       their ID document           (brief p.3)
 *   type=address  their proof of address      (brief p.3)
 *   type=info     their answer to "more information needed" (Email B); the file is optional, and
 *                 sending it moves the application back to "In review" for an officer.
 *
 * The applicant is taken from their session, never from the form, so nobody can attach a file to
 * someone else's application.
 */
export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Storage is not configured" }, { status: 503 });
  }
  const ref = await currentMemberRef();
  if (!ref) {
    return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "That upload could not be read" }, { status: 400 });
  }

  const type = form.get("type");
  if (!isDocType(type) || !UPLOADABLE_DOC_TYPES.includes(type)) {
    return NextResponse.json({ ok: false, error: "Unknown document type" }, { status: 400 });
  }
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const message = typeof form.get("message") === "string" ? String(form.get("message")).trim().slice(0, INFO_MESSAGE_MAX) : "";

  if (type !== "info" && !hasFile) {
    return NextResponse.json({ ok: false, error: "Choose a file to upload" }, { status: 422 });
  }
  if (type === "info" && !hasFile && !message) {
    return NextResponse.json({ ok: false, error: "Add a message or a file" }, { status: 422 });
  }
  if (hasFile) {
    if (!isDocContentType(file.type)) {
      return NextResponse.json({ ok: false, error: "Please upload a photo or a PDF" }, { status: 415 });
    }
    if (file.size > DOC_MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "That file is too large. Please upload one under 4 MB." }, { status: 413 });
    }
    if (!isDocumentStorageConfigured()) {
      console.error("[documents] DOCUMENTS_KEY is not set — an upload was refused.");
      return NextResponse.json({ ok: false, error: "Uploads are not available just now. Please try again later." }, { status: 503 });
    }
  }

  try {
    const member = await findMemberByRef(ref);
    if (!member) {
      return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
    }
    if (member.supporter || !OPEN.includes(member.status)) {
      return NextResponse.json({ ok: false, error: "Your application has already been decided" }, { status: 409 });
    }
    if (type === "info" && member.status !== "Info requested") {
      return NextResponse.json({ ok: false, error: "We have not asked you for anything" }, { status: 409 });
    }

    let documentId = "";
    if (hasFile) {
      documentId = await saveDocument({
        ownerRef: ref,
        type,
        name: file.name,
        contentType: file.type,
        data: new Uint8Array(await file.arrayBuffer()),
      });
      await recordAudit({
        action: "document.uploaded",
        actor: `Applicant (${member.fullName})`,
        subject: ref,
        detail: `${DOC_LABEL[type]} uploaded by the applicant`,
      });
    }

    if (type === "info") {
      const { members } = await collections();
      const at = new Date();
      // Guarded on the status, so a reply that crosses with an officer's decision changes nothing.
      const res = await members.updateOne(
        { reference: ref, status: "Info requested" },
        {
          $set: {
            status: "In review",
            infoResponse: { message, at, documentIds: documentId ? [documentId] : [] },
            updatedAt: at,
          },
        },
      );
      if (res.matchedCount === 1) {
        await recordAudit({
          action: "application.info_received",
          actor: `Applicant (${member.fullName})`,
          subject: ref,
          detail: [message ? `Message: ${message}` : "", documentId ? "with a file attached" : ""].filter(Boolean).join(" — "),
          before: "Info requested",
          after: "In review",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[documents] upload failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "We could not save that just now. Please try again." }, { status: 502 });
  }
}
