"use client";

// One in-memory store for the whole back office, so changes survive moving between screens.
// In the live system each setter becomes an API call and the audit entry is written server-side.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  APPLICATIONS,
  BANK_LINES,
  HOURS,
  INITIAL_SETTINGS,
  JOINING_FEES,
  LOG,
  MEMBERS,
  PENDING_CHANGES,
  PROJECT_STATES,
  PROXIES,
  ROLES,
  SHARE_TXS,
  STAFF,
  TODAY,
  TRANSFERS,
  VOTES,
  WITHDRAWALS,
  type Access,
  type Application,
  type BankLine,
  type HoursClaim,
  type JoiningFee,
  type LogEntry,
  type Member,
  type PendingChange,
  type Perm,
  type ProjectState,
  type Proxy,
  type RoleDef,
  type ScreenId,
  type SettingsState,
  type ShareTx,
  type StaffUser,
  type Transfer,
  type Vote,
  type Withdrawal,
} from "@/lib/admin-data";
import { monthsBetween, nowStamp } from "./lib";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export type IssueCheck = { ok: boolean; held: number; after: number; total: number; pctAfter: number; reason?: string };

export type Store = {
  role: RoleDef;
  setRoleId: (id: string) => void;
  screen: ScreenId;
  go: (s: ScreenId) => void;
  access: (s: ScreenId) => Access;
  can: (p: Perm) => boolean;

  members: Member[];
  setMembers: Setter<Member[]>;
  lines: BankLine[];
  setLines: Setter<BankLine[]>;
  txs: ShareTx[];
  setTxs: Setter<ShareTx[]>;
  transfers: Transfer[];
  setTransfers: Setter<Transfer[]>;
  hours: HoursClaim[];
  setHours: Setter<HoursClaim[]>;
  apps: Application[];
  setApps: Setter<Application[]>;
  fees: JoiningFee[];
  setFees: Setter<JoiningFee[]>;
  withdrawals: Withdrawal[];
  setWithdrawals: Setter<Withdrawal[]>;
  votes: Vote[];
  setVotes: Setter<Vote[]>;
  proxies: Proxy[];
  setProxies: Setter<Proxy[]>;
  meetingDate: string | null;
  setMeetingDate: Setter<string | null>;
  projects: ProjectState[];
  setProjects: Setter<ProjectState[]>;
  settings: SettingsState;
  setSettings: Setter<SettingsState>;
  pending: PendingChange[];
  setPending: Setter<PendingChange[]>;
  staff: StaffUser[];
  setStaff: Setter<StaffUser[]>;
  log: LogEntry[];
  addLog: (action: string, entity: string, before: string, after: string) => void;

  // derived
  holdings: Record<string, number>;
  totalShares: number;
  credit: (no: string) => number;
  lastPaid: (no: string) => string | undefined;
  firstShare: (no: string) => string | undefined;
  member: (no: string | null | undefined) => Member | undefined;
  checkIssue: (no: string, shares: number) => IssueCheck;
  canVote: (m: Member) => boolean;
  nextSeq: () => number;

  // shared ui
  profileNo: string | null;
  openProfile: (no: string | null) => void;
  ui: <T>(key: string, init: T) => [T, (v: T) => void];
};

const Ctx = createContext<Store | null>(null);

export function useAdmin() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAdmin outside AdminStoreProvider");
  return s;
}

export const VOTING_STATUSES: Member["status"][] = ["Active", "Reminder sent"];

export function AdminStoreProvider({
  children,
  initialApps,
  initialLog,
  initialMembers,
}: {
  children: React.ReactNode;
  initialApps?: Application[];
  initialLog?: LogEntry[];
  initialMembers?: Member[];
}) {
  // The KYC officer opens the back office: the Applications queue is what someone signing in is
  // nearly always here for, and it is the one screen Finance cannot act on.
  const [roleId, setRoleId] = useState("kyc");
  const [screen, setScreen] = useState<ScreenId>("register");
  // Every screen opens at the top, not where the previous screen was scrolled to (runs after the new screen renders).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    // Again after layout settles, so the browser's scroll anchoring can't nudge it back down.
    const id = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(id);
  }, [screen]);
  // The real register when the database is connected; the sample members otherwise.
  const [members, setMembers] = useState(initialMembers?.length ? initialMembers : MEMBERS);
  const [lines, setLines] = useState(BANK_LINES);
  const [txs, setTxs] = useState(SHARE_TXS);
  const [transfers, setTransfers] = useState(TRANSFERS);
  const [hours, setHours] = useState(HOURS);
  // Real registrations when the database is connected; the sample queue otherwise.
  const [apps, setApps] = useState(initialApps ?? APPLICATIONS);
  const [fees, setFees] = useState(JOINING_FEES);
  const [withdrawals, setWithdrawals] = useState(WITHDRAWALS);
  const [votes, setVotes] = useState(VOTES);
  const [proxies, setProxies] = useState(PROXIES);
  const [meetingDate, setMeetingDate] = useState<string | null>(null);
  const [projects, setProjects] = useState(PROJECT_STATES);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [pending, setPending] = useState(PENDING_CHANGES);
  const [staff, setStaff] = useState(STAFF);
  // The real audit trail when the database is connected; the sample log otherwise.
  const [log, setLog] = useState(initialLog?.length ? initialLog : LOG);
  const [profileNo, setProfileNo] = useState<string | null>(null);
  const [uiState, setUiState] = useState<Record<string, unknown>>({});
  const logSeq = useRef(100);

  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];

  const addLog = useCallback(
    (action: string, entity: string, before: string, after: string) => {
      const id = `L-${logSeq.current++}`;
      setLog((cur) => [{ id, at: nowStamp(), who: role.person, role: role.title, action, entity, before, after }, ...cur]);
    },
    [role],
  );

  const holdings = useMemo(() => {
    const h: Record<string, number> = {};
    for (const t of txs) h[t.memberNo] = (h[t.memberNo] ?? 0) + t.shares;
    return h;
  }, [txs]);
  const totalShares = useMemo(() => Object.values(holdings).reduce((a, b) => a + b, 0), [holdings]);

  const creditMap = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of lines) if (l.matchStatus === "Credited" && l.memberNo) c[l.memberNo] = (c[l.memberNo] ?? 0) + l.ngnValue;
    for (const t of txs) if (t.type === "issue" && (t.source === "payment" || t.source === "credit")) c[t.memberNo] = (c[t.memberNo] ?? 0) - t.ngnValue;
    for (const k of Object.keys(c)) c[k] = Math.round(c[k] * 100) / 100;
    return c;
  }, [lines, txs]);

  const lastPaidMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const l of lines) if (l.matchStatus === "Credited" && l.memberNo && (!m[l.memberNo] || l.receivedAt > m[l.memberNo])) m[l.memberNo] = l.receivedAt;
    return m;
  }, [lines]);

  const firstShareMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of txs) if (t.shares > 0 && (!m[t.memberNo] || t.date < m[t.memberNo])) m[t.memberNo] = t.date;
    return m;
  }, [txs]);

  const member = useCallback((no: string | null | undefined) => (no ? members.find((m) => m.no === no) : undefined), [members]);

  const checkIssue = useCallback(
    (no: string, shares: number): IssueCheck => {
      const held = holdings[no] ?? 0;
      const after = held + shares;
      const total = totalShares + shares;
      const pctAfter = total ? after / total : 0;
      const m = members.find((x) => x.no === no);
      const cap = settings.capPct / 100;
      if (m?.isCooperative) return { ok: true, held, after, total, pctAfter };
      if (pctAfter > cap)
        return {
          ok: false,
          held,
          after,
          total,
          pctAfter,
          reason: `Blocked by bye-law 11.3: ${shares.toLocaleString("en-GB")} new shares would take ${m?.name ?? no} to ${(pctAfter * 100).toFixed(2)}% of share capital (${after.toLocaleString("en-GB")} of ${total.toLocaleString("en-GB")} shares). The limit is ${settings.capPct}%.`,
        };
      return { ok: true, held, after, total, pctAfter };
    },
    [holdings, totalShares, members, settings.capPct],
  );

  const canVote = useCallback((m: Member) => VOTING_STATUSES.includes(m.status), []);

  const nextSeq = useCallback(() => {
    const nos = [...members.map((m) => m.no), ...apps.map((a) => a.memberNo ?? "")];
    return Math.max(0, ...nos.map((n) => Number(n.split("-")[3] ?? 0) || 0)) + 1;
  }, [members, apps]);

  const ui = useCallback(
    <T,>(key: string, init: T): [T, (v: T) => void] => [
      (key in uiState ? uiState[key] : init) as T,
      (v: T) => setUiState((cur) => ({ ...cur, [key]: v })),
    ],
    [uiState],
  );

  const value: Store = {
    role,
    setRoleId: (id) => {
      setRoleId(id);
      setProfileNo(null);
    },
    screen,
    go: (s) => {
      setScreen(s);
      setProfileNo(null);
    },
    access: (s) => role.screens[s],
    can: (p) => role.perms.includes(p),
    members,
    setMembers,
    lines,
    setLines,
    txs,
    setTxs,
    transfers,
    setTransfers,
    hours,
    setHours,
    apps,
    setApps,
    fees,
    setFees,
    withdrawals,
    setWithdrawals,
    votes,
    setVotes,
    proxies,
    setProxies,
    meetingDate,
    setMeetingDate,
    projects,
    setProjects,
    settings,
    setSettings,
    pending,
    setPending,
    staff,
    setStaff,
    log,
    addLog,
    holdings,
    totalShares,
    credit: (no) => creditMap[no] ?? 0,
    lastPaid: (no) => lastPaidMap[no],
    firstShare: (no) => firstShareMap[no],
    member,
    checkIssue,
    canVote,
    nextSeq,
    profileNo,
    openProfile: setProfileNo,
    ui,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Dormancy rule (9.3): 12 months with no contribution → reminder; a further 3 months → dormant. */
export function dormancyStatus(m: Member, lastPaid: string | undefined): Member["status"] {
  if (!["Active", "Reminder sent", "Dormant"].includes(m.status)) return m.status;
  const since = monthsBetween(lastPaid ?? m.joinedAt, TODAY);
  if (since >= 15) return "Dormant";
  if (since >= 12) return "Reminder sent";
  return "Active";
}
