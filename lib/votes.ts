// Online voting and member ideas (trustees' request; Member Platform brief Phase 3 "online voting
// for AGMs"; bye-laws: one member, one vote).
//
// An officer writes a motion, opens it, and closes it. Every admitted member can vote once (For,
// Against or Abstain) while it is open; the database refuses a second vote from the same member, so
// a double click or a second device cannot count twice. Members see the result once it closes.
// Who voted which way is kept for the audit, but only the totals are ever shown.
//
// Members can also send ideas to the board. An officer marks each one (seen, planned, not now) and
// may add a short reply, which the member sees in their account.

import "server-only";

import { ObjectId } from "mongodb";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import type { MemberDoc } from "@/lib/members";

export const CHOICES = ["For", "Against", "Abstain"] as const;
export type Choice = (typeof CHOICES)[number];
export const isChoice = (v: unknown): v is Choice => typeof v === "string" && (CHOICES as readonly string[]).includes(v);

export type MotionStatus = "draft" | "open" | "closed";

type MotionDoc = {
  _id?: ObjectId;
  title: string;
  details: string;
  status: MotionStatus;
  createdBy: string;
  createdAt: Date;
  openedAt?: Date;
  closedAt?: Date;
};

type VoteDoc = { _id?: ObjectId; motionId: ObjectId; memberNo: string; choice: Choice; at: Date };

export type IdeaStatus = "new" | "seen" | "planned" | "not_now";
export const IDEA_STATUSES: IdeaStatus[] = ["new", "seen", "planned", "not_now"];
export const IDEA_LABEL: Record<IdeaStatus, string> = { new: "New", seen: "Seen by the office", planned: "Planned", not_now: "Not for now" };

type IdeaDoc = {
  _id?: ObjectId;
  memberRef: string;
  memberNo: string;
  name: string;
  chapter: string;
  text: string;
  at: Date;
  status: IdeaStatus;
  reply?: string;
  updatedBy?: string;
  updatedAt?: Date;
};

async function cols() {
  const db = await getDb();
  return { motions: db.collection<MotionDoc>("motions"), votes: db.collection<VoteDoc>("votes"), ideas: db.collection<IdeaDoc>("ideas") };
}

let indexed: Promise<unknown> | null = null;
async function ensureIndexes() {
  indexed ??= (async () => {
    const c = await cols();
    await Promise.all([
      c.votes.createIndex({ motionId: 1, memberNo: 1 }, { unique: true }),
      c.motions.createIndex({ createdAt: -1 }),
      c.ideas.createIndex({ at: -1 }),
      c.ideas.createIndex({ memberRef: 1, at: -1 }),
    ]);
  })().catch((err) => {
    indexed = null;
    throw err;
  });
  return indexed;
}

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

async function counts(motionId: ObjectId) {
  const { votes } = await cols();
  const rows = await votes.aggregate<{ _id: Choice; n: number }>([{ $match: { motionId } }, { $group: { _id: "$choice", n: { $sum: 1 } } }]).toArray();
  const out = Object.fromEntries(CHOICES.map((c) => [c, 0])) as Record<Choice, number>;
  for (const r of rows) out[r._id] = r.n;
  return out;
}

const resultOf = (c: Record<Choice, number>) => (c.For > c.Against ? "Passed" : c.Against > c.For ? "Not passed" : "Tied");

// ---------- Officers ----------

export async function listMotionsForAdmin() {
  await ensureIndexes();
  const { motions } = await cols();
  const list = await motions.find({}).sort({ createdAt: -1 }).limit(50).toArray();
  return Promise.all(
    list.map(async (m) => {
      const c = await counts(m._id!);
      return {
        id: String(m._id),
        title: m.title,
        details: m.details,
        status: m.status,
        createdBy: m.createdBy,
        createdAt: DAY.format(m.createdAt),
        openedAt: m.openedAt ? DAY.format(m.openedAt) : "",
        closedAt: m.closedAt ? DAY.format(m.closedAt) : "",
        counts: c,
        total: c.For + c.Against + c.Abstain,
        result: m.status === "closed" ? resultOf(c) : "",
      };
    }),
  );
}

export async function createMotion(title: string, details: string, actor: string) {
  await ensureIndexes();
  const t = title.trim().slice(0, 200);
  if (!t) return { ok: false as const, error: "Give the motion a title." };
  const { motions } = await cols();
  const res = await motions.insertOne({ title: t, details: details.trim().slice(0, 3000), status: "draft", createdBy: actor, createdAt: new Date() });
  await recordAudit({ action: "vote.motion_created", actor, subject: t, detail: "Motion written (not open yet)" });
  return { ok: true as const, id: String(res.insertedId) };
}

/** draft → open → closed, never backwards, so a closed result cannot be reopened and changed. */
export async function moveMotion(id: string, to: "open" | "closed", actor: string) {
  if (!ObjectId.isValid(id)) return { ok: false as const, error: "Not found" };
  const { motions } = await cols();
  const from: MotionStatus = to === "open" ? "draft" : "open";
  const res = await motions.findOneAndUpdate({ _id: new ObjectId(id), status: from }, { $set: { status: to, [to === "open" ? "openedAt" : "closedAt"]: new Date() } });
  if (!res) return { ok: false as const, error: to === "open" ? "Only a motion that has not been opened can be opened." : "Only an open motion can be closed." };
  const c = to === "closed" ? await counts(res._id!) : null;
  await recordAudit({
    action: to === "open" ? "vote.opened" : "vote.closed",
    actor,
    subject: res.title,
    detail: to === "open" ? "Voting opened to all members" : `Voting closed: For ${c!.For}, Against ${c!.Against}, Abstain ${c!.Abstain} — ${resultOf(c!)}`,
  });
  return { ok: true as const };
}

// ---------- Members ----------

export async function motionsForMember(memberNo: string) {
  await ensureIndexes().catch(() => {});
  const { motions, votes } = await cols();
  const list = await motions.find({ status: { $in: ["open", "closed"] } }).sort({ openedAt: -1 }).limit(10).toArray();
  const mine = await votes.find({ memberNo, motionId: { $in: list.map((m) => m._id!) } }).toArray();
  const myChoice = new Map(mine.map((v) => [String(v.motionId), v.choice]));
  return Promise.all(
    list.map(async (m) => {
      const c = m.status === "closed" ? await counts(m._id!) : null;
      return {
        id: String(m._id),
        title: m.title,
        details: m.details,
        status: m.status as "open" | "closed",
        myVote: myChoice.get(String(m._id)) ?? null,
        result: c ? { ...c, outcome: resultOf(c) } : null,
        closedAt: m.closedAt ? DAY.format(m.closedAt) : "",
      };
    }),
  );
}

export async function castVote(member: MemberDoc, motionId: string, choice: Choice) {
  await ensureIndexes();
  if (!member.membership) return { ok: false as const, error: "Only members can vote.", status: 403 };
  if (!ObjectId.isValid(motionId)) return { ok: false as const, error: "That vote no longer exists.", status: 404 };
  const { motions, votes } = await cols();
  const motion = await motions.findOne({ _id: new ObjectId(motionId) });
  if (!motion) return { ok: false as const, error: "That vote no longer exists.", status: 404 };
  if (motion.status !== "open") return { ok: false as const, error: "This vote is not open.", status: 409 };
  try {
    await votes.insertOne({ motionId: motion._id!, memberNo: member.membership.memberNo, choice, at: new Date() });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { ok: false as const, error: "You have already voted on this.", status: 409 };
    throw err;
  }
  await recordAudit({ action: "vote.cast", actor: `Member (${member.membership.memberNo})`, subject: motion.title, detail: "Vote recorded" });
  return { ok: true as const };
}

// ---------- Ideas ----------

export async function sendIdea(member: MemberDoc, text: string) {
  await ensureIndexes();
  if (!member.membership) return { ok: false as const, error: "Only members can send ideas." };
  const t = text.trim().slice(0, 2000);
  if (t.length < 5) return { ok: false as const, error: "Write a little more about your idea." };
  const { ideas } = await cols();
  // A light limit, so one member cannot flood the list.
  const today = await ideas.countDocuments({ memberRef: member.reference, at: { $gt: new Date(Date.now() - 86_400_000) } });
  if (today >= 5) return { ok: false as const, error: "You have sent five ideas today. Please try again tomorrow." };
  await ideas.insertOne({ memberRef: member.reference, memberNo: member.membership.memberNo, name: member.fullName, chapter: member.chapter, text: t, at: new Date(), status: "new" });
  await recordAudit({ action: "idea.sent", actor: `Member (${member.membership.memberNo})`, subject: "Member idea", detail: t.slice(0, 120) });
  return { ok: true as const };
}

export async function ideasFor(memberRef: string) {
  await ensureIndexes().catch(() => {});
  const { ideas } = await cols();
  return (await ideas.find({ memberRef }).sort({ at: -1 }).limit(10).toArray()).map((i) => ({
    id: String(i._id),
    text: i.text,
    at: DAY.format(i.at),
    status: IDEA_LABEL[i.status],
    reply: i.reply ?? "",
  }));
}

export async function listIdeasForAdmin() {
  await ensureIndexes();
  const { ideas } = await cols();
  return (await ideas.find({}).sort({ at: -1 }).limit(200).toArray()).map((i) => ({
    id: String(i._id),
    memberNo: i.memberNo,
    name: i.name,
    chapter: i.chapter,
    text: i.text,
    at: DAY.format(i.at),
    status: i.status,
    reply: i.reply ?? "",
  }));
}

export async function updateIdea(id: string, status: IdeaStatus, reply: string, actor: string) {
  if (!ObjectId.isValid(id)) return { ok: false as const, error: "Not found" };
  const { ideas } = await cols();
  const res = await ideas.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, reply: reply.trim().slice(0, 1000), updatedBy: actor, updatedAt: new Date() } },
  );
  if (!res) return { ok: false as const, error: "Not found" };
  await recordAudit({ action: "idea.updated", actor, subject: `Idea from ${res.memberNo}`, detail: `${IDEA_LABEL[status]}${reply.trim() ? ` · reply: ${reply.trim().slice(0, 120)}` : ""}`, before: IDEA_LABEL[res.status], after: IDEA_LABEL[status] });
  return { ok: true as const };
}
