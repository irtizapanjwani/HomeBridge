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

/** Most recent entries first, for the admin audit screen. */
export async function listAudit(limit = 200): Promise<AuditDoc[]> {
  const { auditLog } = await collections();
  return auditLog.find({}).sort({ at: -1 }).limit(limit).toArray();
}

/** Everything recorded against one application reference or membership number. */
export async function auditFor(subject: string, limit = 100): Promise<AuditDoc[]> {
  const { auditLog } = await collections();
  return auditLog.find({ subject }).sort({ at: -1 }).limit(limit).toArray();
}
