// Notices to members (Member Platform brief §6: "Broadcast: send a notice to all members, a zone,
// or members in arrears, by WhatsApp, SMS and email").
//
// Email only for now; WhatsApp and SMS join once those services are connected. The officer writes a
// subject and a message, chooses who gets it, sees how many people that is, and sends. The message
// follows the same simple formatting as the email templates (blank line = new paragraph, **bold**,
// "- " lists, {{FirstName}} and {{MemberNo}}), and is wrapped in template Q, which the office can
// edit. Every notice is kept, with who sent it, to whom, and how many went.

import "server-only";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import { getTemplate, renderEmail } from "@/lib/email-templates";
import { collections } from "@/lib/members";
import { currentPeriod, missedPayments } from "@/lib/missed-payments";

export type Audience = { kind: "all" } | { kind: "zone"; zone: string } | { kind: "behind" } | { kind: "pick"; memberNos: string[] };

export function parseAudience(v: unknown): Audience | null {
  if (!v || typeof v !== "object") return null;
  const a = v as { kind?: unknown; zone?: unknown };
  if (a.kind === "all" || a.kind === "behind") return { kind: a.kind };
  if (a.kind === "zone" && typeof a.zone === "string" && a.zone.trim()) return { kind: "zone", zone: a.zone.trim() };
  const nos = (v as { memberNos?: unknown }).memberNos;
  if (a.kind === "pick" && Array.isArray(nos)) {
    const memberNos = nos.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, 1000);
    return memberNos.length ? { kind: "pick", memberNos } : null;
  }
  return null;
}

const audienceLabel = (a: Audience) =>
  a.kind === "all"
    ? "All members"
    : a.kind === "zone"
      ? `Chapter: ${a.zone}`
      : a.kind === "pick"
        ? `Chosen members (${a.memberNos.length})`
        : "Members behind on this month's contribution";

type BroadcastDoc = {
  subject: string;
  message: string;
  audience: string;
  recipients: number;
  sent: number;
  failed: number;
  by: string;
  at: Date;
  /** Who it went to, so the office can see later exactly which members got it. */
  to?: { memberNo: string; name: string; email: string }[];
};

async function log() {
  return (await getDb()).collection<BroadcastDoc>("broadcasts");
}

/** Who a notice would go to: admitted members with an email address. */
async function recipients(a: Audience) {
  const { members } = await collections();
  const admitted = await members
    .find({ "membership.memberNo": { $exists: true } }, { projection: { fullName: 1, firstName: 1, email: 1, chapter: 1, membership: 1 } })
    .toArray();
  let list = admitted.filter((m) => m.email?.trim());
  if (a.kind === "zone") list = list.filter((m) => (m.chapter || "") === a.zone);
  if (a.kind === "pick") {
    const chosen = new Set(a.memberNos);
    list = list.filter((m) => chosen.has(m.membership!.memberNo));
  }
  if (a.kind === "behind") {
    const behind = new Set((await missedPayments(currentPeriod())).rows.map((r) => r.memberNo));
    list = list.filter((m) => behind.has(m.membership!.memberNo));
  }
  return { list, withoutEmail: admitted.length - admitted.filter((m) => m.email?.trim()).length };
}

/** The chapters members belong to, for the "one chapter" choice. */
export async function chapters() {
  const { members } = await collections();
  const list = (await members.distinct("chapter", { "membership.memberNo": { $exists: true } })) as string[];
  return list.filter(Boolean).sort();
}

const person = (m: { fullName: string; email: string; chapter?: string; membership?: { memberNo: string } }) => ({
  memberNo: m.membership!.memberNo,
  name: m.fullName,
  email: m.email,
  chapter: m.chapter || "",
});

/** Exactly who would get it: names and emails, so the officer can check before sending. */
export async function previewCount(a: Audience) {
  const { list, withoutEmail } = await recipients(a);
  return { count: list.length, label: audienceLabel(a), people: list.map(person), withoutEmail };
}

/** Every member with an email, for picking people one by one. */
export async function pickableMembers() {
  const { list } = await recipients({ kind: "all" });
  return list.map(person).sort((x, y) => x.name.localeCompare(y.name));
}

/** The email as the first recipient would see it, wrapped in template Q. */
export async function previewNotice(a: Audience, subject: string, message: string) {
  const { list } = await recipients(a);
  const m = list[0];
  const wrapper = await getTemplate("Q");
  const subj = subject.trim().slice(0, 200) || "(no subject yet)";
  const msg = message.replace(/\r\n/g, "\n").trim().slice(0, 10_000) || "(your message)";
  const template = { subject: wrapper.subject.replace(/\{\{\s*Subject\s*\}\}/g, subj), body: wrapper.body.replace(/\{\{\s*Message\s*\}\}/g, msg) };
  const r = renderEmail(template, {
    FirstName: m ? m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "Member" : "Adaeze",
    MemberNo: m?.membership?.memberNo ?? "HBC-EDO-26-00014",
  });
  return { subject: r.subject, html: r.html, as: m ? m.fullName : "a sample member" };
}

export async function sendBroadcast(a: Audience, subject: string, message: string, actor: string) {
  const subj = subject.trim().slice(0, 200);
  const msg = message.replace(/\r\n/g, "\n").trim().slice(0, 10_000);
  if (!subj) return { ok: false as const, error: "Write a subject." };
  if (msg.length < 5) return { ok: false as const, error: "Write the message." };
  const { list } = await recipients(a);
  if (!list.length) return { ok: false as const, error: "Nobody matches that choice." };

  // The office's wrapper (template Q) with the officer's subject and message dropped in.
  const wrapper = await getTemplate("Q");
  const template = { subject: wrapper.subject.replace(/\{\{\s*Subject\s*\}\}/g, subj), body: wrapper.body.replace(/\{\{\s*Message\s*\}\}/g, msg) };
  const emails = list.map((m) => ({
    to: m.email,
    ...renderEmail(template, { FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "Member", MemberNo: m.membership!.memberNo }),
  }));
  const result = await sendEmailBatch(emails);

  await (await log()).insertOne({
    subject: subj,
    message: msg,
    audience: audienceLabel(a),
    recipients: list.length,
    sent: result.sent,
    failed: result.failed,
    by: actor,
    at: new Date(),
    to: list.map((m) => ({ memberNo: m.membership!.memberNo, name: m.fullName, email: m.email })),
  });
  await recordAudit({
    action: "notice.sent",
    actor,
    subject: subj,
    detail: `Notice to ${audienceLabel(a)}: ${result.sent} of ${list.length} sent by email${result.failed ? `, ${result.failed} failed (${result.errors[0] ?? ""})` : ""}`,
  });
  return { ok: true as const, recipients: list.length, ...result };
}

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export async function recentBroadcasts() {
  return (await (await log()).find({}).sort({ at: -1 }).limit(20).toArray()).map((b) => ({
    id: String((b as { _id?: unknown })._id),
    subject: b.subject,
    audience: b.audience,
    recipients: b.recipients,
    sent: b.sent,
    failed: b.failed,
    by: b.by,
    at: DAY.format(b.at),
    message: b.message,
    to: b.to ?? [],
  }));
}
