// The audit trail (developer brief, p.6).
//
// "Audit log of every view of an ID document, every approval, every number issued and every change
//  to account details."
//
// Append-only by design: there is a write and there are reads, and nothing here updates or deletes
// a row. Release 1 is accepted only when "every approval and number issued appears in the audit
// log" (brief p.7), so a failure to record must fail the action rather than pass quietly.

import "server-only";

import type { ClientSession } from "mongodb";

import type { LogEntry } from "@/lib/admin-data";
import { type AuditDoc, collections } from "@/lib/members";

export type AuditEntry = Omit<AuditDoc, "at">;

/**
 * Appends one entry. Pass the session when the entry belongs with a change to a member record, so
 * the two are written together or not at all.
 */
export async function recordAudit(entry: AuditEntry, session?: ClientSession): Promise<void> {
  const { auditLog } = await collections();
  await auditLog.insertOne({ ...entry, at: new Date() }, { session });
}

/** Most recent entries first. */
export async function listAudit(limit = 200): Promise<AuditDoc[]> {
  const { auditLog } = await collections();
  return auditLog.find({}).sort({ at: -1 }).limit(limit).toArray();
}

/** Plain words for the machine-readable action names, for the audit screen. */
const ACTION_LABEL: Record<string, string> = {
  "application.approved": "Approved application",
  "application.declined": "Refused application",
  "application.info_requested": "Requested information",
  "application.in_review": "Marked in review",
  "application.id_checked": "Recorded ID check",
  "member.number_issued": "Issued membership number",
  "member.number_confirmed": "Confirmed membership number",
  "member.certificate_issued": "Generated certificate",
  "fee.confirmed": "Confirmed joining fee",
  "fee.receipt_issued": "Generated fee receipt",
  "fee.receipt_emailed": "Emailed fee receipt",
  "fee.receipt_email_failed": "Fee receipt email failed",
  "welcome_pack.sent": "Sent welcome pack",
  "welcome_pack.resent": "Resent welcome pack",
  "welcome_pack.failed": "Welcome pack failed to send",
  "applications.imported": "Imported Google Form applicants",
};

// One fixed zone, so officers in Benin City, Abuja and the UK read the same clock and the page
// cannot hydrate differently from the way it rendered.
const LAGOS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * The audit trail shaped for the admin screen.
 *
 * `role` is the same for every row while all officers share one password; once each has their own
 * account it becomes their actual role and this column starts earning its place.
 */
export async function listAuditForAdmin(limit = 500): Promise<LogEntry[]> {
  const { auditLog } = await collections();
  const docs = await auditLog.find({}).sort({ at: -1 }).limit(limit).toArray();
  return docs.map((d, i) => {
    const after = d.after && d.detail && d.detail !== d.after ? `${d.after} · ${d.detail}` : (d.after ?? d.detail);
    return {
      id: String((d as { _id?: unknown })._id ?? `audit-${i}`),
      at: LAGOS.format(d.at),
      who: d.actor,
      role: "VEKAT admin",
      action: ACTION_LABEL[d.action] ?? d.action,
      entity: d.subject,
      before: d.before ?? "—",
      after,
    };
  });
}

/** Everything recorded against one application reference or membership number. */
export async function auditFor(subject: string, limit = 100): Promise<AuditDoc[]> {
  const { auditLog } = await collections();
  return auditLog.find({ subject }).sort({ at: -1 }).limit(limit).toArray();
}
