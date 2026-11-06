// General meetings: the AGM date, its notice to every member, and the numbers for the quorum.
//
// Bye-law 16.3: at least 21 days' notice of a general meeting, with the agenda, to every member.
// Bye-law 16.5: quorum is the lesser of 20% of voting members or 50, including at least a quarter
// from each of the home and diaspora groups. Setting the date emails the notice (template S)
// straight away, so no officer has to send it by hand.

import "server-only";

import { getSetting, setSetting } from "@/lib/app-settings";
import { recordAudit } from "@/lib/audit";
import { sendEmailBatch } from "@/lib/email";
import { agendaBlock, buttonBlock, getTemplate, renderEmail } from "@/lib/email-templates";
import { getDb } from "@/lib/db";
import { type MemberDoc, collections } from "@/lib/members";

export const NOTICE_DAYS = 21;

export type Agm = {
  /** Stays the same when the meeting is moved, so members' replies carry over. */
  id?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, Lagos time */
  time: string;
  place: string;
  agenda: string;
  noticeSentAt: string;
  sent: number;
  failed: number;
  of: number;
};

const KEY = "agm";

/** Today in Lagos as YYYY-MM-DD. */
export function lagosToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const earliestAgmDate = () => addDaysIso(lagosToday(), NOTICE_DAYS);

export function meetingLabel(date: string, time: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  return time ? `${day}, ${time}` : day;
}

export async function getAgm(): Promise<Agm | null> {
  return getSetting<Agm | null>(KEY, null);
}

/** Members who can vote now: everyone admitted. Home = living in Nigeria. */
export async function voterCounts() {
  const { members } = await collections();
  const list = await members.find({ "membership.memberNo": { $exists: true } }, { projection: { country: 1 } }).toArray();
  const home = list.filter((m) => m.country === "Nigeria").length;
  return { total: list.length, home, diaspora: list.length - home };
}

export async function setAgm(input: { date: string; time: string; place: string; agenda: string }, actor: string, site: string) {
  const date = input.date.trim();
  const time = /^\d{2}:\d{2}$/.test(input.time.trim()) ? input.time.trim() : "";
  const place = input.place.trim().slice(0, 200);
  const agenda = input.agenda.replace(/\r\n/g, "\n").trim().slice(0, 4000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false as const, error: "Choose the meeting date." };
  const earliest = earliestAgmDate();
  if (date < earliest) return { ok: false as const, error: `At least ${NOTICE_DAYS} days' notice is needed (bye-law 16.3). The earliest date is ${earliest}.` };
  if (!place) return { ok: false as const, error: "Say where the meeting will be held." };
  if (!agenda) return { ok: false as const, error: "Write the agenda, one item per line." };

  const before = await getAgm();
  const label = meetingLabel(date, time);

  // Email every admitted member the notice (template S).
  const { members } = await collections();
  const list = (
    await members
      .find({ "membership.memberNo": { $exists: true } }, { projection: { fullName: 1, firstName: 1, email: 1, membership: 1 } })
      .toArray()
  ).filter((m) => m.email?.trim());
  const portal = `${site.replace(/\/+$/, "")}/app`;
  const template = await getTemplate("S");
  const blocks = { AGENDA: agendaBlock(agenda), BUTTON: buttonBlock("See the meeting and reply", `${portal}#meeting`) };
  const result = list.length
    ? await sendEmailBatch(
        list.map((m) => ({
          to: m.email,
          ...renderEmail(
            template,
            {
              FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "Member",
              MemberNo: m.membership!.memberNo,
              MeetingDate: label,
              Place: place,
              PortalLink: portal,
            },
            blocks,
          ),
        })),
      )
    : { sent: 0, failed: 0, errors: [] as string[] };

  // Moving an upcoming meeting keeps its replies; setting one after the last has passed starts afresh.
  const id = before && before.date >= lagosToday() ? agmIdOf(before) : `agm-${Date.now()}`;
  const agm: Agm = { id, date, time, place, agenda, noticeSentAt: new Date().toISOString(), sent: result.sent, failed: result.failed, of: list.length };
  await setSetting(KEY, agm, actor, `AGM set for ${label}, ${place}`, before ? meetingLabel(before.date, before.time) : "Not set", label);
  await recordAudit({
    action: result.failed ? "meeting.notice_failed" : "meeting.notice_sent",
    actor,
    subject: "Annual General Meeting",
    before: before ? meetingLabel(before.date, before.time) : undefined,
    after: label,
    detail: `AGM notice: ${result.sent} of ${list.length} members emailed${result.failed ? `, ${result.failed} failed (${result.errors[0] ?? ""})` : ""}`,
  }).catch(() => {});
  return { ok: true as const, agm };
}

// ---------- Replies: will the member attend? ----------

export type AgmAnswer = "yes" | "no";
type ReplyDoc = { agmId: string; memberNo: string; name: string; answer: AgmAnswer; at: Date };

const agmIdOf = (a: Agm) => a.id ?? `agm-${a.noticeSentAt}`;

async function replies() {
  const c = (await getDb()).collection<ReplyDoc>("agm_replies");
  repliesIndexed ??= c.createIndex({ agmId: 1, memberNo: 1 }, { unique: true }).then(
    () => undefined,
    () => {
      repliesIndexed = null;
    },
  );
  return c;
}
let repliesIndexed: Promise<void> | null = null;

/** The meeting is shown to members until the end of its day. */
async function upcomingAgm() {
  const agm = await getAgm();
  return agm && agm.date >= lagosToday() ? agm : null;
}

const agendaItems = (agenda: string) =>
  agenda
    .split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)]|[-*])\s*/, "").trim())
    .filter(Boolean);

export type MeetingView = { when: string; place: string; agenda: string[]; daysLeft: number; answer: AgmAnswer | null };

/** What the member's account shows: the next meeting and their own reply. */
export async function meetingForMember(memberNo: string): Promise<MeetingView | null> {
  const agm = await upcomingAgm();
  if (!agm) return null;
  const mine = await (await replies()).findOne({ agmId: agmIdOf(agm), memberNo });
  const daysLeft = Math.round((Date.parse(`${agm.date}T12:00:00Z`) - Date.parse(`${lagosToday()}T12:00:00Z`)) / 86_400_000);
  return { when: meetingLabel(agm.date, agm.time), place: agm.place, agenda: agendaItems(agm.agenda), daysLeft, answer: mine?.answer ?? null };
}

export async function replyToAgm(member: MemberDoc, answer: AgmAnswer) {
  if (!member.membership) return { ok: false as const, error: "Only members can reply." };
  const agm = await upcomingAgm();
  if (!agm) return { ok: false as const, error: "There is no meeting to reply to just now." };
  const memberNo = member.membership.memberNo;
  await (await replies()).updateOne(
    { agmId: agmIdOf(agm), memberNo },
    { $set: { answer, name: member.fullName, at: new Date() } },
    { upsert: true },
  );
  await recordAudit({
    action: "meeting.reply",
    actor: `Member (${memberNo})`,
    subject: "Annual General Meeting",
    detail: answer === "yes" ? "Will attend" : "Cannot attend",
  }).catch(() => {});
  return { ok: true as const };
}

/** Who has said they will come, who cannot, and who has not replied, for the admin AGM card. */
export async function agmReplies() {
  const agm = await getAgm();
  if (!agm) return null;
  const { members } = await collections();
  const [rows, admitted] = await Promise.all([
    (await replies()).find({ agmId: agmIdOf(agm) }).sort({ at: -1 }).toArray(),
    members
      .find({ "membership.memberNo": { $exists: true } }, { projection: { fullName: 1, country: 1, chapter: 1, membership: 1 } })
      .sort({ "membership.seq": 1 })
      .toArray(),
  ]);
  const byNo = new Map(admitted.map((m) => [m.membership!.memberNo, m]));
  const replied = new Set(rows.map((r) => r.memberNo));
  const person = (no: string, name: string) => {
    const m = byNo.get(no);
    return { memberNo: no, name: m?.fullName ?? name, group: m?.country === "Nigeria" ? "home" : "diaspora", chapter: m?.chapter ?? "" };
  };
  const yes = rows.filter((r) => r.answer === "yes").map((r) => person(r.memberNo, r.name));
  return {
    yes,
    no: rows.filter((r) => r.answer === "no").map((r) => person(r.memberNo, r.name)),
    noReply: admitted.filter((m) => !replied.has(m.membership!.memberNo)).map((m) => person(m.membership!.memberNo, m.fullName)),
    yesHome: yes.filter((p) => p.group === "home").length,
    yesDiaspora: yes.filter((p) => p.group === "diaspora").length,
  };
}
