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
import { sendEmailBatch } from "@/lib/email";
import { buttonBlock, getTemplate, quoteBox, renderEmail } from "@/lib/email-templates";
import { type MemberDoc, collections as memberCollections } from "@/lib/members";

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

type VoteDoc = {
  _id?: ObjectId;
  motionId: ObjectId;
  memberNo: string;
  choice: Choice;
  at: Date;
  /** Set when a proxy holder cast this vote for the member (bye-law 16.4). */
  byProxy?: string;
};

/** A member's proxy for one motion: who may vote for them. Cancelled proxies are kept for the record. */
// `live` is true until the proxy is cancelled. MongoDB cannot build a partial index on "field does
// not exist", so the one-live-proxy rule below keys on this flag instead of on cancelledAt.
type ProxyDoc = { _id?: ObjectId; motionId: ObjectId; giverNo: string; giverName: string; holderNo: string; at: Date; live?: true; cancelledAt?: Date };

/** Bye-law 16.4: nobody may hold more than five proxies. */
export const MAX_PROXIES_HELD = 5;

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
  return {
    motions: db.collection<MotionDoc>("motions"),
    votes: db.collection<VoteDoc>("votes"),
    ideas: db.collection<IdeaDoc>("ideas"),
    proxies: db.collection<ProxyDoc>("proxies"),
  };
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
      // One live proxy per member per motion.
      c.proxies.createIndex({ motionId: 1, giverNo: 1 }, { name: "one_live_proxy", unique: true, partialFilterExpression: { live: true } }),
      c.proxies.createIndex({ motionId: 1, holderNo: 1 }),
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
  // Reads never wait for index set-up; writes (votes, proxies) still do, as they rely on it.
  void ensureIndexes().catch(() => {});
  const { motions } = await cols();
  const list = await motions.find({}).sort({ createdAt: -1 }).limit(50).toArray();
  // Every motion's totals in one trip to the database, instead of two queries per motion.
  const { votes } = await cols();
  const rows = list.length
    ? await votes
        .aggregate<{ _id: { m: ObjectId; c: Choice }; n: number; proxy: number }>([
          { $match: { motionId: { $in: list.map((m) => m._id!) } } },
          { $group: { _id: { m: "$motionId", c: "$choice" }, n: { $sum: 1 }, proxy: { $sum: { $cond: [{ $ifNull: ["$byProxy", false] }, 1, 0] } } } },
        ])
        .toArray()
    : [];
  const tally = new Map<string, { counts: Record<Choice, number>; byProxy: number }>();
  for (const r of rows) {
    const k = String(r._id.m);
    const t = tally.get(k) ?? { counts: Object.fromEntries(CHOICES.map((c) => [c, 0])) as Record<Choice, number>, byProxy: 0 };
    t.counts[r._id.c] = r.n;
    t.byProxy += r.proxy;
    tally.set(k, t);
  }
  return Promise.all(
    list.map(async (m) => {
      const t = tally.get(String(m._id));
      const c = t?.counts ?? (Object.fromEntries(CHOICES.map((x) => [x, 0])) as Record<Choice, number>);
      const byProxy = t?.byProxy ?? 0;
      return {
        id: String(m._id),
        byProxy,
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

/**
 * Deletes a motion with its votes and proxies. A draft goes quietly; an open or closed vote is
 * removed too when the officer insists, and its totals at that moment are kept in the audit log.
 */
export async function deleteMotion(id: string, actor: string) {
  if (!ObjectId.isValid(id)) return { ok: false as const, error: "Not found" };
  const { motions, votes, proxies } = await cols();
  const _id = new ObjectId(id);
  const m = await motions.findOne({ _id });
  if (!m) return { ok: false as const, error: "That motion has already been deleted." };
  const c = await counts(_id);
  const total = c.For + c.Against + c.Abstain;
  await Promise.all([votes.deleteMany({ motionId: _id }), proxies.deleteMany({ motionId: _id })]);
  await motions.deleteOne({ _id });
  await recordAudit({
    action: "vote.motion_deleted",
    actor,
    subject: m.title,
    before: m.status === "draft" ? "Not open yet" : m.status === "open" ? "Voting open" : "Closed",
    after: "Deleted",
    detail:
      m.status === "draft" ? "Motion deleted before it was opened" : `Motion deleted with ${total} vote${total === 1 ? "" : "s"} (For ${c.For}, Against ${c.Against}, Abstain ${c.Abstain})`,
  });
  return { ok: true as const };
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
export async function moveMotion(id: string, to: "open" | "closed", actor: string, site?: string) {
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
  // Opening a vote tells every member straight away (Email R), so no officer has to send a notice.
  // The vote is already open even if some emails fail; the result says how many went.
  const emailed = to === "open" && site ? await announceMotion(res, actor, site).catch(() => null) : null;
  return { ok: true as const, emailed };
}

/** Emails every admitted member with an email address that a vote is open (template R). */
async function announceMotion(m: MotionDoc, actor: string, site: string) {
  const { members } = await memberCollections();
  const list = (
    await members
      .find({ "membership.memberNo": { $exists: true } }, { projection: { fullName: 1, firstName: 1, email: 1, membership: 1 } })
      .toArray()
  ).filter((x) => x.email?.trim());
  if (!list.length) return { sent: 0, failed: 0, of: 0 };
  const portal = `${site.replace(/\/+$/, "")}/app`;
  const template = await getTemplate("R");
  const blocks = {
    MOTION_DETAILS: m.details?.trim() ? quoteBox(m.details.trim()) : undefined,
    BUTTON: buttonBlock("Vote in your account", portal),
  };
  const emails = list.map((x) => ({
    to: x.email,
    ...renderEmail(
      template,
      {
        FirstName: x.firstName?.trim() || x.fullName.trim().split(/\s+/)[0] || "Member",
        MemberNo: x.membership!.memberNo,
        Motion: m.title,
        PortalLink: portal,
      },
      blocks,
    ),
  }));
  const result = await sendEmailBatch(emails);
  await recordAudit({
    action: result.failed ? "email.vote_open_failed" : "email.vote_open_sent",
    actor,
    subject: m.title,
    detail: `Vote-open email: ${result.sent} of ${list.length} sent${result.failed ? `, ${result.failed} failed (${result.errors[0] ?? ""})` : ""}`,
  }).catch(() => {});
  return { sent: result.sent, failed: result.failed, of: list.length };
}

/**
 * Who has voted on a motion and who has not, for the office to follow up. Never includes the
 * choice: the vote's choice field is not even read here, so this list cannot reveal how anyone voted.
 */
export async function turnout(id: string, opts: { withChoices?: boolean; actor?: string } = {}) {
  if (!ObjectId.isValid(id)) return null;
  const { motions, votes } = await cols();
  const motion = await motions.findOne({ _id: new ObjectId(id) });
  if (!motion) return null;
  const { members } = await memberCollections();
  const [cast, admitted] = await Promise.all([
    // The choice is read only when the Board has switched individual votes on (Settings).
    votes.find({ motionId: motion._id! }, { projection: { memberNo: 1, at: 1, byProxy: 1, ...(opts.withChoices ? { choice: 1 } : {}) } }).sort({ at: 1 }).toArray(),
    members
      .find({ "membership.memberNo": { $exists: true } }, { projection: { fullName: 1, chapter: 1, membership: 1 } })
      .sort({ "membership.seq": 1 })
      .toArray(),
  ]);
  const nameOf = new Map(admitted.map((m) => [m.membership!.memberNo, m.fullName]));
  const votedSet = new Set(cast.map((v) => v.memberNo));
  if (opts.withChoices && cast.length) {
    await recordAudit({ action: "vote.choices_viewed", actor: opts.actor ?? "Officer", subject: motion.title, detail: `Viewed how ${cast.length} member${cast.length === 1 ? "" : "s"} voted` }).catch(() => {});
  }
  const stamp = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  return {
    voted: cast.map((v) => ({
      memberNo: v.memberNo,
      name: nameOf.get(v.memberNo) ?? "",
      at: stamp.format(v.at),
      byProxy: v.byProxy ? `${nameOf.get(v.byProxy) ?? ""} (${v.byProxy})`.trim() : "",
      choice: opts.withChoices ? (v.choice ?? null) : null,
    })),
    showChoices: Boolean(opts.withChoices),
    notVoted: admitted
      .filter((m) => !votedSet.has(m.membership!.memberNo))
      .map((m) => ({ memberNo: m.membership!.memberNo, name: m.fullName, chapter: m.chapter || "" })),
  };
}

// ---------- Members ----------

export async function motionsForMember(memberNo: string) {
  await ensureIndexes().catch(() => {});
  const { motions, votes, proxies } = await cols();
  const list = await motions.find({ status: { $in: ["open", "closed"] } }).sort({ openedAt: -1 }).limit(10).toArray();
  const ids = list.map((m) => m._id!);
  const mine = await votes.find({ memberNo, motionId: { $in: ids } }).toArray();
  const myChoice = new Map(mine.map((v) => [String(v.motionId), v]));
  const given = await proxies.find({ giverNo: memberNo, motionId: { $in: ids }, cancelledAt: { $exists: false } }).toArray();
  const held = await proxies.find({ holderNo: memberNo, motionId: { $in: ids }, cancelledAt: { $exists: false } }).toArray();
  const heldVotes = held.length
    ? await votes.find({ motionId: { $in: ids }, memberNo: { $in: held.map((p) => p.giverNo) } }).toArray()
    : [];
  return Promise.all(
    list.map(async (m) => {
      const id = String(m._id);
      const c = m.status === "closed" ? await counts(m._id!) : null;
      const myVote = myChoice.get(id);
      const proxyGiven = given.find((p) => String(p.motionId) === id);
      return {
        id,
        title: m.title,
        details: m.details,
        status: m.status as "open" | "closed",
        myVote: myVote?.choice ?? null,
        /** Set when the member's own vote was cast by their proxy holder. */
        myVoteByProxy: myVote?.byProxy ?? null,
        result: c ? { ...c, outcome: resultOf(c) } : null,
        closedAt: m.closedAt ? DAY.format(m.closedAt) : "",
        proxyGivenTo: proxyGiven?.holderNo ?? null,
        proxiesHeld: held
          .filter((p) => String(p.motionId) === id)
          .map((p) => ({
            memberNo: p.giverNo,
            name: p.giverName.split(/\s+/)[0] ?? "",
            voted: heldVotes.find((v) => String(v.motionId) === id && v.memberNo === p.giverNo)?.choice ?? null,
          })),
      };
    }),
  );
}

// ---------- Proxies (bye-law 16.4) ----------

/**
 * A member names another member to vote for them on one open motion. Rules: not yourself, the holder
 * must be a member, you have not voted yet, the holder holds fewer than five, and the holder has not
 * given their own proxy away (no chains).
 */
export async function giveProxy(member: MemberDoc, motionId: string, holderNoRaw: string) {
  await ensureIndexes();
  if (!member.membership) return { ok: false as const, error: "Only members can give a proxy." };
  if (!ObjectId.isValid(motionId)) return { ok: false as const, error: "That vote no longer exists." };
  const holderNo = holderNoRaw.trim().toUpperCase().replace(/\s+/g, "");
  const me = member.membership.memberNo;
  if (holderNo === me) return { ok: false as const, error: "You cannot give your proxy to yourself." };
  const { motions, votes, proxies } = await cols();
  const motion = await motions.findOne({ _id: new ObjectId(motionId) });
  if (!motion || motion.status !== "open") return { ok: false as const, error: "This vote is not open." };
  if (await votes.findOne({ motionId: motion._id!, memberNo: me })) return { ok: false as const, error: "You have already voted on this." };
  const { members } = await memberCollections();
  const holder = await members.findOne({ "membership.memberNo": holderNo }, { projection: { fullName: 1 } });
  if (!holder) return { ok: false as const, error: "No member holds that number. Check it with them." };
  const live = { motionId: motion._id!, cancelledAt: { $exists: false } };
  if (await proxies.findOne({ ...live, giverNo: holderNo })) return { ok: false as const, error: "That member has given their own proxy away, so they cannot hold yours." };
  if ((await proxies.countDocuments({ ...live, holderNo })) >= MAX_PROXIES_HELD) {
    return { ok: false as const, error: `That member already holds ${MAX_PROXIES_HELD} proxies, the most allowed.` };
  }
  try {
    await proxies.insertOne({ motionId: motion._id!, giverNo: me, giverName: member.fullName, holderNo, at: new Date(), live: true });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { ok: false as const, error: "You have already given your proxy on this vote. Cancel it first." };
    throw err;
  }
  await recordAudit({ action: "vote.proxy_given", actor: `Member (${me})`, subject: motion.title, detail: `Proxy given to ${holderNo}` });
  return { ok: true as const };
}

/** Cancels a member's own proxy, as long as it has not been used. */
export async function cancelProxy(member: MemberDoc, motionId: string) {
  if (!member.membership || !ObjectId.isValid(motionId)) return { ok: false as const, error: "Not found." };
  const me = member.membership.memberNo;
  const { votes, proxies, motions } = await cols();
  const motion = await motions.findOne({ _id: new ObjectId(motionId) });
  if (!motion || motion.status !== "open") return { ok: false as const, error: "This vote is not open." };
  if (await votes.findOne({ motionId: motion._id!, memberNo: me })) return { ok: false as const, error: "Your vote has already been cast, so the proxy cannot be cancelled." };
  const res = await proxies.findOneAndUpdate({ motionId: motion._id!, giverNo: me, cancelledAt: { $exists: false } }, { $set: { cancelledAt: new Date() }, $unset: { live: "" } });
  if (!res) return { ok: false as const, error: "You have not given a proxy on this vote." };
  await recordAudit({ action: "vote.proxy_cancelled", actor: `Member (${me})`, subject: motion.title, detail: `Proxy to ${res.holderNo} cancelled` });
  return { ok: true as const };
}

/**
 * Records one vote. With `forMemberNo`, the signed-in member votes as proxy for that member, which
 * needs a live proxy from them. Either way the database allows one vote per member per motion.
 */
export async function castVote(member: MemberDoc, motionId: string, choice: Choice, forMemberNo?: string) {
  await ensureIndexes();
  if (!member.membership) return { ok: false as const, error: "Only members can vote.", status: 403 };
  if (!ObjectId.isValid(motionId)) return { ok: false as const, error: "That vote no longer exists.", status: 404 };
  const { motions, votes, proxies } = await cols();
  const motion = await motions.findOne({ _id: new ObjectId(motionId) });
  if (!motion) return { ok: false as const, error: "That vote no longer exists.", status: 404 };
  if (motion.status !== "open") return { ok: false as const, error: "This vote is not open.", status: 409 };
  const me = member.membership.memberNo;
  const voter = forMemberNo ? forMemberNo.trim().toUpperCase() : me;
  if (forMemberNo) {
    const proxy = await proxies.findOne({ motionId: motion._id!, giverNo: voter, holderNo: me, cancelledAt: { $exists: false } });
    if (!proxy) return { ok: false as const, error: "You do not hold that member's proxy for this vote.", status: 403 };
  } else if (await proxies.findOne({ motionId: motion._id!, giverNo: me, cancelledAt: { $exists: false } })) {
    return { ok: false as const, error: "You have given your proxy on this vote. Cancel it first if you want to vote yourself.", status: 409 };
  }
  try {
    await votes.insertOne({ motionId: motion._id!, memberNo: voter, choice, at: new Date(), ...(forMemberNo ? { byProxy: me } : {}) });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { ok: false as const, error: forMemberNo ? "That member's vote has already been cast." : "You have already voted on this.", status: 409 };
    throw err;
  }
  await recordAudit({
    action: "vote.cast",
    actor: `Member (${me})`,
    subject: motion.title,
    detail: forMemberNo ? `Vote recorded for ${voter} as their proxy` : "Vote recorded",
  });
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
  // Reads never wait for index set-up; writes (votes, proxies) still do, as they rely on it.
  void ensureIndexes().catch(() => {});
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
  // Reads never wait for index set-up; writes (votes, proxies) still do, as they rely on it.
  void ensureIndexes().catch(() => {});
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
