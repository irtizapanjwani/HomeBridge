// Forms reminders (brief Phase 2: "Automatic reminders at 7 and 14 days if not returned"; Email Set
// E: "Forms reminder — 7 and 14 days after welcome, if forms not returned").
//
// A daily job (app/api/cron/forms-reminders) finds members whose welcome pack went out 7 or 14 days
// ago and who have still not signed their declaration or nominee form online, and sends Email E.
// Each member gets each stage at most once: the stage is claimed on their record before the email
// goes, so two runs at once cannot both send it, and released again if the send fails.

import "server-only";

import { getSetting, setSetting } from "@/lib/app-settings";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { buttonBlock, renderTemplate } from "@/lib/email-templates";
import { type MemberDoc, collections } from "@/lib/members";
import { returnByDate } from "@/lib/pdf/pack-forms";

export const REMINDER_DAYS = [7, 14] as const;
export type ReminderStage = (typeof REMINDER_DAYS)[number];

const DAY_MS = 86_400_000;

// ---------- The switch ----------

const AUTO_KEY = "forms_reminders_auto";

/** Off until the office switches it on, so testing never emails a real member by surprise. */
export const isRemindersAuto = () => getSetting(AUTO_KEY, false);

export async function setRemindersAuto(on: boolean, actor: string) {
  const before = await isRemindersAuto();
  await setSetting(
    AUTO_KEY,
    on,
    actor,
    on ? "Forms reminders now send automatically" : "Forms reminders switched off",
    before ? "Automatic" : "Off",
    on ? "Automatic" : "Off",
  );
}

// ---------- Which stage is due ----------

/** The forms a member has not signed yet, as the email names them. Empty when both are done. */
export function missingForms(m: Pick<MemberDoc, "forms">): string[] {
  return [!m.forms?.declaration && "Member Declaration Form", !m.forms?.nominee && "Nominee Form"].filter(Boolean) as string[];
}

/**
 * The reminder stage due now, or null. If a run was missed and both are overdue, only the later one
 * is sent (and the earlier marked as passed), so nobody gets two reminders on the same morning.
 */
export function dueStage(welcomeSentAt: Date, now: Date, sent: Partial<Record<`day${ReminderStage}`, Date>>): ReminderStage | null {
  const days = (now.getTime() - welcomeSentAt.getTime()) / DAY_MS;
  const due = [...REMINDER_DAYS].reverse().find((d) => days >= d);
  if (!due || sent[`day${due}`]) return null;
  return due;
}

// ---------- Sending ----------

async function sendReminder(m: MemberDoc, site: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const missing = missingForms(m);
  if (!m.membership || !missing.length) return { ok: false, error: "nothing to remind about" };
  if (!m.email?.trim()) return { ok: false, error: "the member has no email address" };
  const portal = `${site.replace(/\/+$/, "")}/app`;
  const email = await renderTemplate(
    "E",
    {
      FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "there",
      MemberNo: m.membership.memberNo,
      MissingForms: missing.join(" and "),
      ReturnBy: returnByDate(m.membership.admittedAt),
      PortalLink: portal,
    },
    { BUTTON: buttonBlock("Sign your forms", portal) },
  );
  const sent = await sendEmail({ to: m.email, ...email });
  return sent.ok ? { ok: true } : { ok: false, error: sent.error };
}

/** An officer sends Email E to one member now, whatever the schedule. */
export async function sendReminderNow(reference: string, actor: string, site: string) {
  const { members } = await collections();
  const m = await members.findOne({ reference });
  if (!m) return { ok: false as const, error: "That registration no longer exists" };
  if (!m.membership) return { ok: false as const, error: "This applicant has not been admitted yet" };
  if (!missingForms(m).length) return { ok: false as const, error: "Both forms are already signed" };
  const result = await sendReminder(m, site);
  const at = new Date();
  if (result.ok) await members.updateOne({ reference }, { $set: { "formsReminders.lastManual": at } });
  await recordAudit({
    action: result.ok ? "email.forms_reminder_sent" : "email.forms_reminder_failed",
    actor,
    subject: m.membership.memberNo,
    detail: result.ok
      ? `Forms reminder sent by hand to ${m.email} (${missingForms(m).join(" and ")})`
      : `Forms reminder could not be sent: ${result.error}`,
  }).catch(() => {});
  return result.ok ? { ok: true as const } : { ok: false as const, error: result.error };
}

export type RunResult = { checked: number; sent: number; failed: number; skipped: "off" | null };

/**
 * The daily run. `force` is for the office's "send due reminders now" button and still respects
 * every rule (due date, not already sent, forms still missing); it only ignores the off switch.
 */
export async function runFormsReminders(site: string, opts: { force?: boolean; actor?: string } = {}): Promise<RunResult> {
  if (!opts.force && !(await isRemindersAuto())) return { checked: 0, sent: 0, failed: 0, skipped: "off" };
  const now = new Date();
  const { members } = await collections();
  // Admitted, welcomed at least 7 days ago, and at least one form not yet signed.
  const candidates = await members
    .find(
      {
        "membership.memberNo": { $exists: true },
        "welcomePack.sentAt": { $lte: new Date(now.getTime() - REMINDER_DAYS[0] * DAY_MS) },
        $or: [{ "forms.declaration": { $exists: false } }, { "forms.nominee": { $exists: false } }],
      },
      { projection: { receipt: 0 } },
    )
    .toArray();

  let sent = 0;
  let failed = 0;
  for (const m of candidates) {
    const stage = dueStage(m.welcomePack!.sentAt, now, m.formsReminders ?? {});
    if (!stage) continue;
    const field = `formsReminders.day${stage}` as const;
    // Claim the stage first (and any earlier stage that was missed), so a second run cannot also send.
    const claim = await members.updateOne(
      { reference: m.reference, [field]: { $exists: false } },
      { $set: Object.fromEntries(REMINDER_DAYS.filter((d) => d <= stage).map((d) => [`formsReminders.day${d}`, now])) },
    );
    if (claim.matchedCount === 0) continue;

    const result = await sendReminder(m, site).catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : "unknown error" }));
    if (result.ok) sent++;
    else {
      failed++;
      // Released, so tomorrow's run tries this stage again.
      await members.updateOne({ reference: m.reference }, { $unset: { [field]: "" } });
    }
    await recordAudit({
      action: result.ok ? "email.forms_reminder_sent" : "email.forms_reminder_failed",
      actor: opts.actor ?? "Automatic reminders",
      subject: m.membership!.memberNo,
      detail: result.ok
        ? `${stage}-day forms reminder sent to ${m.email} (${missingForms(m).join(" and ")})`
        : `${stage}-day forms reminder could not be sent: ${result.error}`,
    }).catch(() => {});
  }
  return { checked: candidates.length, sent, failed, skipped: null };
}
