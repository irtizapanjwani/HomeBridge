// Sample data for the admin back office. Every name, number and amount here is a placeholder.
// Replace with real API calls when the backend exists. Field names follow the developer brief (p.7–8).

import { EXAMPLE_RATES, FOUNDING_BLOCK, JOINING_FEE, MAX_HOLDING_SHARE, MAX_PROXIES, MIN_MONTHLY, SHARE_PRICE_NGN, SOCIETIES, SOCIETY_ACCOUNTS } from "@/lib/settings";

/** The sample data is pinned to one day so every screen agrees on "today". */
export const TODAY = "2026-10-13";
/** Sample registration date of the societies (used for the founding window and history). */
export const REGISTERED_ON = "2025-05-20";

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export type ScreenId =
  | "register"
  | "contributions"
  | "applications"
  | "fees"
  | "withdrawals"
  | "meetings"
  | "projects"
  | "reports"
  | "audit"
  | "settings";

export type Access = "none" | "read" | "act";

export type Perm =
  | "kyc.decide" // approve, ask for info, refuse
  | "pay.import" // import statements
  | "pay.match" // match, confirm, manage suspense
  | "shares.issue"
  | "fees.match" // match First Bank receipts
  | "fees.export"
  | "board.approve" // withdrawals, transfers, professional hours
  | "treasurer.pay" // payment approvals within 14.3 limits
  | "settings.propose"
  | "settings.proposeBank" // bank details and fees
  | "settings.approve"
  | "users.manage"
  | "meetings.manage"
  | "projects.checks"
  | "export.all";

export type RoleDef = {
  id: string;
  title: string;
  heldBy: string; // "VEKAT", "Elected", …
  person: string; // the signed-in person (placeholder)
  summary: string;
  screens: Record<ScreenId, Access>;
  perms: Perm[];
};

const all = (a: Access): Record<ScreenId, Access> => ({
  register: a,
  contributions: a,
  applications: a,
  fees: a,
  withdrawals: a,
  meetings: a,
  projects: a,
  reports: a,
  audit: a,
  settings: a,
});

export const ROLES: RoleDef[] = [
  {
    id: "kyc",
    title: "KYC officer",
    heldBy: "VEKAT",
    person: "[KYC officer]",
    summary: "Reviews applications and ID checks; approves, asks for information or refuses with a reason.",
    screens: { ...all("read"), contributions: "none", withdrawals: "none", applications: "act" },
    perms: ["kyc.decide"],
  },
  {
    id: "finance",
    title: "Finance officer",
    heldBy: "VEKAT",
    person: "[Finance officer]",
    summary: "Imports statements, matches payments, issues shares and manages suspense. Cannot change bank details.",
    screens: { ...all("read"), register: "act", contributions: "act", fees: "act", withdrawals: "act", reports: "act", settings: "act" },
    perms: ["pay.import", "pay.match", "shares.issue", "fees.match", "fees.export", "settings.propose", "export.all"],
  },
  {
    id: "registration",
    title: "VEKAT registration",
    heldBy: "VEKAT",
    person: "[Registration desk]",
    summary: "Views and exports joining-fee payments only. No access to share accounts.",
    screens: { ...all("none"), fees: "read", reports: "read" },
    perms: ["fees.export"],
  },
  {
    id: "board",
    title: "Board member",
    heldBy: "Elected",
    person: "[Board member]",
    summary: "Reads everything; approves withdrawals, transfers and professional-hours valuations.",
    screens: { ...all("read"), register: "act", withdrawals: "act", meetings: "act", projects: "act" },
    perms: ["board.approve", "meetings.manage", "projects.checks", "export.all", "fees.export"],
  },
  {
    id: "treasurer",
    title: "Treasurer / Chairman",
    heldBy: "Elected",
    person: "[Treasurer]",
    summary: "Second approval on settings changes; payment approvals within the 14.3 limits.",
    screens: { ...all("read"), withdrawals: "act", settings: "act" },
    perms: ["treasurer.pay", "settings.approve", "export.all", "fees.export"],
  },
  {
    id: "audit",
    title: "Audit Committee",
    heldBy: "Elected, non-Board",
    person: "[Audit Committee]",
    summary: "Read-only to all books and the audit log (19.2).",
    screens: all("read"),
    perms: ["export.all", "fees.export"],
  },
  {
    id: "super1",
    title: "Super admin",
    heldBy: "[Admin A]",
    person: "[Admin A]",
    summary: "Users, roles, bank details and fees. Every change needs a second approver.",
    screens: { ...all("read"), settings: "act" },
    perms: ["settings.propose", "settings.proposeBank", "settings.approve", "users.manage", "export.all", "fees.export"],
  },
  {
    id: "super2",
    title: "Super admin",
    heldBy: "[Admin B]",
    person: "[Admin B]",
    summary: "Users, roles, bank details and fees. Every change needs a second approver.",
    screens: { ...all("read"), settings: "act" },
    perms: ["settings.propose", "settings.proposeBank", "settings.approve", "users.manage", "export.all", "fees.export"],
  },
];

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

export type MemberType = "Home" | "Diaspora" | "Founding" | "Professional" | "Group";
export type MemberStatus =
  | "Active"
  | "Reminder sent"
  | "Dormant"
  | "Suspended"
  | "Awaiting first share"
  | "Withdrawn"
  | "Deceased";
export type Society = "ED" | "FC";
export const SOCIETIES_BY_CODE = Object.fromEntries(SOCIETIES.map((x) => [x.code, x.name])) as Record<"ED" | "FC", string>;
export type Region = "NG-ED" | "NG-FC" | "NG-OTHER" | "UK" | "US" | "AFRICA";

export const REGIONS: { id: Region; label: string }[] = [
  { id: "NG-ED", label: "Nigeria — Edo" },
  { id: "NG-FC", label: "Nigeria — FCT" },
  { id: "NG-OTHER", label: "Nigeria — other states" },
  { id: "UK", label: "United Kingdom" },
  { id: "US", label: "United States" },
  { id: "AFRICA", label: "Rest of Africa" },
];

export const CHAPTERS: Record<string, string> = {
  ED: "HomeBridge Edo",
  AB: "HomeBridge Abuja",
  LA: "HomeBridge Lagos",
  UK: "HomeBridge UK",
  US: "HomeBridge US",
  GH: "HomeBridge Ghana",
};

export type KycCheck = {
  idType: "BVN" | "NIN" | "NR-BVN" | "Passport" | "CAC + rep NIN" | "CAC + rep BVN";
  provider: string;
  providerRef: string; // never the raw ID number
  liveness: "Pass" | "Fail" | "Not required" | "Pending";
  docMatch: "Pass" | "Fail" | "Pending";
  addressOk: boolean;
  result: "Pass" | "Refer" | "Fail" | "Not started" | "Pending";
  reviewer?: string;
};

export type Nominee = { name: string; relationship: string; percent: number };

export type Member = {
  no: string;
  name: string;
  type: MemberType;
  society: Society;
  chapter: string;
  base: "home" | "diaspora";
  livesIn: string;
  region: Region;
  route: string;
  phone: string;
  email: string;
  status: MemberStatus;
  joinedAt: string;
  endedAt?: string;
  endReason?: string;
  /** Registered cooperative societies are exempt from the 20% cap (11.3). */
  isCooperative?: boolean;
  groupRep?: string;
  kyc: KycCheck;
  nominees: Nominee[];
};

const passKyc = (idType: KycCheck["idType"], provider: string, ref: string): KycCheck => ({
  idType,
  provider,
  providerRef: ref,
  liveness: idType.startsWith("CAC") ? "Not required" : "Pass",
  docMatch: "Pass",
  addressOk: true,
  result: "Pass",
  reviewer: "[KYC officer]",
});

export const MEMBERS: Member[] = [
  {
    no: "HB-ED-ED-000012", name: "[Member A]", type: "Founding", society: "ED", chapter: "ED", base: "home",
    livesIn: "Benin City, Edo", region: "NG-ED", route: "Lives in Edo", phone: "+234 803 000 0012", email: "member.a@example.com",
    status: "Active", joinedAt: "2025-10-03", kyc: passKyc("BVN", "Dojah", "DJH-7Q2K-1180"),
    nominees: [{ name: "[Nominee A1]", relationship: "Spouse", percent: 100 }],
  },
  {
    no: "HB-ED-UK-000045", name: "[Member B]", type: "Diaspora", society: "ED", chapter: "UK", base: "diaspora",
    livesIn: "Manchester, UK", region: "UK", route: "Family land, Edo (Ekpoma)", phone: "+44 7700 900045", email: "member.b@example.com",
    status: "Active", joinedAt: "2026-08-28", kyc: passKyc("Passport", "Smile ID", "SMI-4F81-AC09"),
    nominees: [{ name: "[Nominee B1]", relationship: "Sister", percent: 50 }, { name: "[Nominee B2]", relationship: "Brother", percent: 50 }],
  },
  {
    no: "HB-FC-AB-000031", name: "[Member C]", type: "Home", society: "FC", chapter: "AB", base: "home",
    livesIn: "Abuja, FCT", region: "NG-FC", route: "Lives in FCT", phone: "+234 809 000 0031", email: "member.c@example.com",
    status: "Active", joinedAt: "2026-04-30", kyc: passKyc("NIN", "Prembly", "PRB-22X9-0031"),
    nominees: [{ name: "[Nominee C1]", relationship: "Daughter", percent: 100 }],
  },
  {
    no: "HB-FC-US-000027", name: "[Member D]", type: "Professional", society: "FC", chapter: "US", base: "diaspora",
    livesIn: "Houston, US", region: "US", route: "Family home, FCT (Kubwa)", phone: "+1 713 555 0127", email: "member.d@example.com",
    status: "Active", joinedAt: "2026-04-11", kyc: passKyc("NR-BVN", "Prembly", "PRB-91TT-0027"),
    nominees: [{ name: "[Nominee D1]", relationship: "Spouse", percent: 70 }, { name: "[Nominee D2]", relationship: "Son", percent: 30 }],
  },
  {
    no: "HB-FC-AB-000009", name: "[Group E]", type: "Group", society: "FC", chapter: "AB", base: "home",
    livesIn: "Abuja, FCT", region: "NG-FC", route: "Group (5.3)", phone: "+234 802 000 0009", email: "group.e@example.com",
    status: "Active", joinedAt: "2026-05-04", groupRep: "[Rep of Group E]", kyc: passKyc("CAC + rep NIN", "Dojah", "DJH-CAC-RC-0009"),
    nominees: [],
  },
  {
    no: "HB-ED-UK-000003", name: "[Member F]", type: "Diaspora", society: "ED", chapter: "UK", base: "diaspora",
    livesIn: "London, UK", region: "UK", route: "Family land, Edo (Auchi)", phone: "+44 7700 900003", email: "member.f@example.com",
    status: "Reminder sent", joinedAt: "2025-08-25", kyc: passKyc("Passport", "Smile ID", "SMI-0B3C-7720"),
    nominees: [{ name: "[Nominee F1]", relationship: "Mother", percent: 100 }],
  },
  {
    no: "HB-ED-UK-000002", name: "[Member G]", type: "Founding", society: "ED", chapter: "UK", base: "diaspora",
    livesIn: "London, UK", region: "UK", route: "Family home, Edo (Benin City)", phone: "+44 7700 900002", email: "member.g@example.com",
    status: "Active", joinedAt: "2026-03-05", kyc: passKyc("Passport", "Smile ID", "SMI-77AA-0002"),
    nominees: [{ name: "[Nominee G1]", relationship: "Spouse", percent: 100 }],
  },
  {
    no: "HB-ED-ED-000005", name: "[Member N]", type: "Founding", society: "ED", chapter: "ED", base: "home",
    livesIn: "Benin City, Edo", region: "NG-ED", route: "Lives in Edo", phone: "+234 803 000 0005", email: "member.n@example.com",
    status: "Active", joinedAt: "2026-03-01", kyc: passKyc("BVN", "Dojah", "DJH-55LM-0005"),
    nominees: [{ name: "[Nominee N1]", relationship: "Son", percent: 100 }],
  },
  {
    no: "HB-FC-AB-000001", name: "[Member L]", type: "Founding", society: "FC", chapter: "AB", base: "home",
    livesIn: "Abuja, FCT", region: "NG-FC", route: "Lives in FCT", phone: "+234 805 000 0001", email: "member.l@example.com",
    status: "Active", joinedAt: "2026-02-27", kyc: passKyc("BVN", "Dojah", "DJH-01QW-0001"),
    nominees: [{ name: "[Nominee L1]", relationship: "Spouse", percent: 60 }, { name: "[Nominee L2]", relationship: "Daughter", percent: 40 }],
  },
  {
    no: "HB-FC-US-000004", name: "[Member M]", type: "Founding", society: "FC", chapter: "US", base: "diaspora",
    livesIn: "Atlanta, US", region: "US", route: "Family land, FCT (Gwagwalada)", phone: "+1 404 555 0104", email: "member.m@example.com",
    status: "Active", joinedAt: "2026-03-08", kyc: passKyc("NR-BVN", "Prembly", "PRB-3MM3-0004"),
    nominees: [{ name: "[Nominee M1]", relationship: "Brother", percent: 100 }],
  },
  {
    no: "HB-ED-LA-000051", name: "[Member H]", type: "Home", society: "ED", chapter: "LA", base: "home",
    livesIn: "Lagos, Lagos", region: "NG-OTHER", route: "Family land, Edo (Uromi)", phone: "+234 806 000 0051", email: "member.h@example.com",
    status: "Dormant", joinedAt: "2025-06-16", kyc: passKyc("BVN", "Dojah", "DJH-8HJ2-0051"),
    nominees: [{ name: "[Nominee H1]", relationship: "Spouse", percent: 100 }],
  },
  {
    no: "HB-FC-UK-000060", name: "[Member I]", type: "Diaspora", society: "FC", chapter: "UK", base: "diaspora",
    livesIn: "Birmingham, UK", region: "UK", route: "Family home, FCT (Karu)", phone: "+44 7700 900060", email: "member.i@example.com",
    status: "Suspended", joinedAt: "2026-06-08", kyc: passKyc("Passport", "Smile ID", "SMI-60II-9014"),
    nominees: [{ name: "[Nominee I1]", relationship: "Father", percent: 100 }],
  },
  {
    no: "HB-ED-GH-000038", name: "[Member J]", type: "Diaspora", society: "ED", chapter: "GH", base: "diaspora",
    livesIn: "Accra, Ghana", region: "AFRICA", route: "Family land, Edo (Igueben)", phone: "+233 20 000 0038", email: "member.j@example.com",
    status: "Active", joinedAt: "2026-08-12", kyc: passKyc("Passport", "Smile ID", "SMI-GH38-5521"),
    nominees: [{ name: "[Nominee J1]", relationship: "Spouse", percent: 100 }],
  },
  {
    no: "HB-FC-AB-000014", name: "[Member K]", type: "Home", society: "FC", chapter: "AB", base: "home",
    livesIn: "Abuja, FCT", region: "NG-FC", route: "Lives in FCT", phone: "+234 807 000 0014", email: "member.k@example.com",
    status: "Withdrawn", joinedAt: "2025-11-07", endedAt: "2026-07-01", endReason: "Transferred all shares (9.1c)",
    kyc: passKyc("NIN", "Prembly", "PRB-14KK-0014"), nominees: [{ name: "[Nominee K1]", relationship: "Spouse", percent: 100 }],
  },
  {
    no: "HB-ED-ED-000020", name: "[Member P]", type: "Home", society: "ED", chapter: "ED", base: "home",
    livesIn: "Benin City, Edo", region: "NG-ED", route: "Lives in Edo", phone: "+234 803 000 0020", email: "member.p@example.com",
    status: "Deceased", joinedAt: "2025-11-28", endedAt: "2026-09-21", endReason: "Died (9.1a) — nominee claim",
    kyc: passKyc("BVN", "Dojah", "DJH-20PP-0020"),
    nominees: [{ name: "[Nominee P1]", relationship: "Spouse", percent: 75 }, { name: "[Nominee P2]", relationship: "Son", percent: 25 }],
  },
];

/* ------------------------------------------------------------------ */
/* Bank lines (payments) and share transactions                        */
/* ------------------------------------------------------------------ */

export type AccountId = "UBA" | "USD-dom" | "GBP-dom";
export type Cur = "NGN" | "USD" | "GBP";
export const ACCOUNT_CURRENCY: Record<AccountId, Cur> = { UBA: "NGN", "USD-dom": "USD", "GBP-dom": "GBP" };
export const ACCOUNT_LABEL: Record<AccountId, string> = {
  UBA: SOCIETY_ACCOUNTS.NGN.label,
  "USD-dom": "USD domiciliary",
  "GBP-dom": "GBP domiciliary",
};

export type MatchStatus = "Suspense" | "Matched — to confirm" | "Credited" | "Returned";

export type BankLine = {
  id: string;
  receivedAt: string;
  account: AccountId;
  amount: number;
  currency: Cur;
  fxRate: number;
  ngnValue: number;
  bankRef: string;
  matchStatus: MatchStatus;
  memberNo: string | null;
  matchedBy?: string; // "auto" or a person
  source: "statement" | "import";
  note?: string;
};

export type ShareTxType = "issue" | "transfer_in" | "transfer_out" | "withdrawal" | "bonus";
export type ShareTx = {
  id: string;
  memberNo: string;
  type: ShareTxType;
  shares: number; // signed: negative for transfer_out / withdrawal
  ngnValue: number;
  paymentId?: string;
  source: "payment" | "credit" | "hours" | "transfer" | "withdrawal";
  approvedBy: string;
  date: string;
  note?: string;
};

type SeedPay = [memberNo: string, date: string, account: AccountId, amount: number, rate?: number, hold?: boolean];

const SEED_CREDITED: SeedPay[] = [
  ["HB-ED-LA-000051", "2025-06-20", "UBA", 40_000],
  ["HB-ED-UK-000003", "2025-09-02", "GBP-dom", 7.5, 1_990],
  ["HB-ED-ED-000012", "2025-10-03", "UBA", 1_990_000],
  ["HB-FC-AB-000014", "2025-11-10", "UBA", 15_000],
  ["HB-ED-ED-000020", "2025-12-01", "UBA", 60_000],
  ["HB-FC-AB-000001", "2026-03-02", "UBA", 2_100_000],
  ["HB-ED-ED-000005", "2026-03-05", "UBA", 2_000_000],
  ["HB-ED-UK-000002", "2026-03-10", "GBP-dom", 1_000, 2_040],
  ["HB-FC-US-000004", "2026-03-12", "USD-dom", 1_400, 1_465],
  ["HB-FC-AB-000009", "2026-05-10", "UBA", 250_000],
  ["HB-FC-AB-000031", "2026-05-05", "UBA", 10_000],
  ["HB-FC-UK-000060", "2026-06-12", "GBP-dom", 6, 2_050],
  ["HB-FC-US-000027", "2026-07-30", "USD-dom", 33, 1_490],
  ["HB-ED-ED-000005", "2026-08-02", "UBA", 5_000],
  ["HB-ED-GH-000038", "2026-08-15", "USD-dom", 20, 1_500],
  ["HB-FC-US-000027", "2026-08-30", "USD-dom", 33, 1_502.5],
  ["HB-ED-ED-000012", "2026-09-01", "UBA", 5_000],
  ["HB-ED-UK-000045", "2026-09-02", "GBP-dom", 25, 2_028],
  ["HB-ED-ED-000005", "2026-09-02", "UBA", 5_000],
  ["HB-FC-AB-000031", "2026-09-05", "UBA", 10_000],
  ["HB-FC-AB-000001", "2026-09-15", "UBA", 150_000, undefined, true],
  ["HB-FC-AB-000009", "2026-09-28", "UBA", 50_000],
  ["HB-ED-UK-000002", "2026-09-29", "GBP-dom", 25, 2_052.4],
  ["HB-FC-US-000027", "2026-09-30", "USD-dom", 33, 1_510],
  ["HB-ED-ED-000012", "2026-10-01", "UBA", 5_000],
  ["HB-ED-UK-000045", "2026-10-02", "GBP-dom", 14, 2_035],
  ["HB-FC-US-000004", "2026-10-02", "USD-dom", 20, 1_512.5],
  ["HB-FC-AB-000031", "2026-10-05", "UBA", 5_000],
];

const round2 = (n: number) => Math.round(n * 100) / 100;

function buildLedger() {
  const lines: BankLine[] = [];
  const txs: ShareTx[] = [];
  const credit: Record<string, number> = {};
  SEED_CREDITED.forEach(([memberNo, date, account, amount, rate, hold], i) => {
    const currency = ACCOUNT_CURRENCY[account];
    const fxRate = rate ?? 1;
    const ngnValue = round2(amount * fxRate);
    const id = `BL-${String(1000 + i)}`;
    lines.push({
      id,
      receivedAt: date,
      account,
      amount,
      currency,
      fxRate,
      ngnValue,
      bankRef: memberNo,
      matchStatus: "Credited",
      memberNo,
      matchedBy: "auto",
      source: "statement",
      note: hold ? "Share issue blocked by the 20% cap (11.3) — held as unallocated credit" : undefined,
    });
    if (hold) return;
    const available = ngnValue + (credit[memberNo] ?? 0);
    const shares = Math.floor(available / SHARE_PRICE_NGN);
    credit[memberNo] = round2(available - shares * SHARE_PRICE_NGN);
    if (shares > 0)
      txs.push({
        id: `ST-${String(5000 + i)}`,
        memberNo,
        type: "issue",
        shares,
        ngnValue: shares * SHARE_PRICE_NGN,
        paymentId: id,
        source: "payment",
        approvedBy: "[Finance officer]",
        date,
      });
  });
  // Member K transferred all 15 shares to Member C (Board approved), then left.
  txs.push(
    { id: "ST-6001", memberNo: "HB-FC-AB-000014", type: "transfer_out", shares: -15, ngnValue: -15_000, source: "transfer", approvedBy: "[Board member]", date: "2026-07-01", note: "To HB-FC-AB-000031 (11.5)" },
    { id: "ST-6002", memberNo: "HB-FC-AB-000031", type: "transfer_in", shares: 15, ngnValue: 15_000, source: "transfer", approvedBy: "[Board member]", date: "2026-07-01", note: "From HB-FC-AB-000014 (11.5)" },
  );
  return { lines, txs };
}

const built = buildLedger();

export const BANK_LINES: BankLine[] = [
  ...built.lines,
  { id: "BL-2001", receivedAt: "2026-10-09", account: "UBA", amount: 20_000, currency: "NGN", fxRate: 1, ngnValue: 20_000, bankRef: "HBEDO123 (typo)", matchStatus: "Suspense", memberNo: null, source: "statement" },
  { id: "BL-2002", receivedAt: "2026-10-10", account: "GBP-dom", amount: 25, currency: "GBP", fxRate: 2_046, ngnValue: 51_150, bankRef: "TRF/OKORO A/OCT", matchStatus: "Suspense", memberNo: null, source: "statement" },
  { id: "BL-2003", receivedAt: "2026-10-11", account: "USD-dom", amount: 25, currency: "USD", fxRate: 1_508, ngnValue: 37_700, bankRef: "HB-ED-GH-000038", matchStatus: "Matched — to confirm", memberNo: "HB-ED-GH-000038", matchedBy: "auto", source: "statement" },
  { id: "BL-2004", receivedAt: "2026-10-12", account: "UBA", amount: 10_000, currency: "NGN", fxRate: 1, ngnValue: 10_000, bankRef: "HB-FC-AB-000031", matchStatus: "Matched — to confirm", memberNo: "HB-FC-AB-000031", matchedBy: "auto", source: "statement" },
  { id: "BL-2005", receivedAt: "2026-10-12", account: "USD-dom", amount: 30, currency: "USD", fxRate: 1_507, ngnValue: 45_210, bankRef: "HB-FC-UK-000061", matchStatus: "Suspense", memberNo: null, source: "statement", note: "Reference is a member number not yet on the register" },
];

export const SHARE_TXS: ShareTx[] = built.txs;

/* ------------------------------------------------------------------ */
/* Board items on a member: transfers and professional hours           */
/* ------------------------------------------------------------------ */

export type Transfer = { id: string; from: string; to: string; shares: number; requestedAt: string; status: "Awaiting Board" | "Approved" | "Declined"; decidedBy?: string };
export const TRANSFERS: Transfer[] = [
  { id: "TR-0007", from: "HB-ED-UK-000045", to: "HB-ED-GH-000038", shares: 20, requestedAt: "2026-10-06", status: "Awaiting Board" },
  { id: "TR-0004", from: "HB-FC-AB-000014", to: "HB-FC-AB-000031", shares: 15, requestedAt: "2026-06-20", status: "Approved", decidedBy: "[Board member]" },
];

export type HoursClaim = { id: string; memberNo: string; month: string; hours: number; rate: number; work: string; status: "Awaiting Board" | "Approved" | "Declined"; decidedBy?: string };
export const HOURS: HoursClaim[] = [
  { id: "PH-0003", memberNo: "HB-FC-US-000027", month: "2026-09", hours: 8, rate: 2_500, work: "Structural review of the food-processing site plan", status: "Awaiting Board" },
  { id: "PH-0004", memberNo: "HB-FC-US-000027", month: "2026-10", hours: 30, rate: 2_500, work: "Engineering drawings for solar kit mounting", status: "Awaiting Board" },
];

/* ------------------------------------------------------------------ */
/* Applications (KYC queue)                                            */
/* ------------------------------------------------------------------ */

export type AppStatus = "Submitted" | "In review" | "Info requested" | "Approved (fee due)" | "Fee paid" | "Active" | "Refused" | "Supporter";
export const PENDING_APP: AppStatus[] = ["Submitted", "In review", "Info requested"];

export type Application = {
  id: string;
  name: string;
  type: MemberType;
  society: Society;
  chapter: string;
  base: "home" | "diaspora";
  livesIn: string;
  region: Region;
  routeKind: "lives" | "land" | "home" | "group" | "other" | "none";
  route: string;
  landLocation?: string;
  dob: string;
  goodCharacter: boolean;
  submittedAt: string;
  status: AppStatus;
  source: "web" | "gform";
  kyc: KycCheck;
  nominees: Nominee[];
  memberNo?: string;
  decidedBy?: string;
  decisionReason?: string;
  note?: string;
  phone: string;
  email: string;
  /**
   * The time of day the registration arrived, as HH:MM in Lagos. Formatted on the server in one
   * fixed zone rather than the viewer's, so officers in Benin City, Abuja and the UK all read the
   * same clock and the page cannot hydrate differently from how it rendered.
   */
  submittedTime?: string;
  /** Set when the applicant uploaded a payment receipt. The bytes are fetched separately. */
  receipt?: { name: string; type: string; bytes: number };
  /** Whose account paid, when it was not the applicant's own. */
  payerName?: string;
};

export const APPLICATIONS: Application[] = [
  {
    id: "APP-0141", name: "[Applicant A]", type: "Diaspora", society: "ED", chapter: "UK", base: "diaspora", livesIn: "Leeds, UK", region: "UK",
    routeKind: "land", route: "Family land in Edo", landLocation: "Uromi, Esan North-East LGA, Edo", dob: "1991-02-14", goodCharacter: true,
    submittedAt: "2026-10-09", status: "In review", source: "web", phone: "+44 7700 900141", email: "applicant.a@example.com",
    kyc: { idType: "Passport", provider: "Smile ID", providerRef: "SMI-9A41-0141", liveness: "Pass", docMatch: "Pass", addressOk: true, result: "Pass" },
    nominees: [{ name: "[Nominee]", relationship: "Spouse", percent: 60 }, { name: "[Nominee]", relationship: "Daughter", percent: 40 }],
  },
  {
    id: "APP-0142", name: "[Applicant B]", type: "Home", society: "ED", chapter: "ED", base: "home", livesIn: "Benin City, Edo", region: "NG-ED",
    routeKind: "lives", route: "Lives in Edo", dob: "1988-07-03", goodCharacter: true,
    submittedAt: "2026-10-12", status: "Submitted", source: "web", phone: "+234 803 000 0142", email: "applicant.b@example.com",
    kyc: { idType: "BVN", provider: "Dojah", providerRef: "DJH-0142-BB71", liveness: "Pass", docMatch: "Pass", addressOk: true, result: "Pass" },
    nominees: [{ name: "[Nominee]", relationship: "Brother", percent: 100 }],
  },
  {
    id: "APP-0137", name: "[Applicant C — group]", type: "Group", society: "FC", chapter: "AB", base: "home", livesIn: "Abuja, FCT", region: "NG-FC",
    routeKind: "group", route: "Registered group in FCT (5.3)", dob: "1980-01-01", goodCharacter: true,
    submittedAt: "2026-10-01", status: "Info requested", source: "web", phone: "+234 802 000 0137", email: "group.c@example.com",
    kyc: { idType: "CAC + rep NIN", provider: "Dojah", providerRef: "DJH-CAC-0137", liveness: "Not required", docMatch: "Pass", addressOk: false, result: "Refer" },
    nominees: [],
    note: "Asked for a signed letter naming the group’s representative (5.3).",
  },
  {
    id: "APP-0139", name: "[Applicant D]", type: "Professional", society: "FC", chapter: "US", base: "diaspora", livesIn: "Dallas, US", region: "US",
    routeKind: "home", route: "Family home in FCT", landLocation: "Kubwa, Bwari Area Council, FCT", dob: "1979-11-22", goodCharacter: true,
    submittedAt: "2026-10-06", status: "In review", source: "web", phone: "+1 214 555 0139", email: "applicant.d@example.com",
    kyc: { idType: "NR-BVN", provider: "Prembly", providerRef: "PRB-0139-DD02", liveness: "Pass", docMatch: "Pass", addressOk: true, result: "Pass" },
    nominees: [{ name: "[Nominee]", relationship: "Spouse", percent: 50 }, { name: "[Nominee]", relationship: "Son", percent: 40 }],
  },
  {
    id: "APP-0128", name: "[Applicant E]", type: "Home", society: "ED", chapter: "ED", base: "home", livesIn: "Auchi, Edo", region: "NG-ED",
    routeKind: "lives", route: "Lives in Edo", dob: "1995-04-09", goodCharacter: true,
    submittedAt: "2026-09-24", status: "Approved (fee due)", source: "web", memberNo: "HB-ED-ED-000058", decidedBy: "[KYC officer]",
    phone: "+234 803 000 0128", email: "applicant.e@example.com",
    kyc: { idType: "NIN", provider: "Prembly", providerRef: "PRB-0128-EE55", liveness: "Pass", docMatch: "Pass", addressOk: true, result: "Pass", reviewer: "[KYC officer]" },
    nominees: [{ name: "[Nominee]", relationship: "Mother", percent: 100 }],
  },
  {
    id: "APP-0125", name: "[Applicant F]", type: "Diaspora", society: "FC", chapter: "UK", base: "diaspora", livesIn: "Croydon, UK", region: "UK",
    routeKind: "home", route: "Family home in FCT", landLocation: "Karu, AMAC, FCT", dob: "1986-12-30", goodCharacter: true,
    submittedAt: "2026-09-18", status: "Fee paid", source: "web", memberNo: "HB-FC-UK-000061", decidedBy: "[KYC officer]",
    phone: "+44 7700 900125", email: "applicant.f@example.com",
    kyc: { idType: "Passport", provider: "Smile ID", providerRef: "SMI-0125-FF13", liveness: "Pass", docMatch: "Pass", addressOk: true, result: "Pass", reviewer: "[KYC officer]" },
    nominees: [{ name: "[Nominee]", relationship: "Spouse", percent: 100 }],
  },
  {
    id: "APP-0120", name: "[Applicant G]", type: "Home", society: "FC", chapter: "AB", base: "home", livesIn: "Abuja, FCT", region: "NG-FC",
    routeKind: "lives", route: "Lives in FCT", dob: "2009-03-15", goodCharacter: true,
    submittedAt: "2026-09-10", status: "Refused", source: "web", decidedBy: "[KYC officer]", decisionReason: "Under 18 at application (5.1). May reapply from March 2027.",
    phone: "+234 809 000 0120", email: "applicant.g@example.com",
    kyc: { idType: "NIN", provider: "Prembly", providerRef: "PRB-0120-GG08", liveness: "Pass", docMatch: "Pass", addressOk: true, result: "Pass", reviewer: "[KYC officer]" },
    nominees: [{ name: "[Nominee]", relationship: "Father", percent: 100 }],
  },
  {
    id: "APP-0131", name: "[Applicant H]", type: "Diaspora", society: "ED", chapter: "UK", base: "diaspora", livesIn: "Glasgow, UK", region: "UK",
    routeKind: "none", route: "None yet", dob: "1990-05-05", goodCharacter: true,
    submittedAt: "2026-09-29", status: "Supporter", source: "gform", decidedBy: "[KYC officer]", decisionReason: "No residence route yet (5.2) — added to the Supporter list.",
    phone: "+44 7700 900131", email: "applicant.h@example.com",
    kyc: { idType: "Passport", provider: "—", providerRef: "—", liveness: "Pending", docMatch: "Pending", addressOk: false, result: "Not started" },
    nominees: [],
  },
  {
    id: "APP-0110", name: "[Member J]", type: "Diaspora", society: "ED", chapter: "GH", base: "diaspora", livesIn: "Accra, Ghana", region: "AFRICA",
    routeKind: "land", route: "Family land in Edo", landLocation: "Igueben LGA, Edo", dob: "1984-08-19", goodCharacter: true,
    submittedAt: "2026-08-03", status: "Active", source: "web", memberNo: "HB-ED-GH-000038", decidedBy: "[KYC officer]",
    phone: "+233 20 000 0038", email: "member.j@example.com",
    kyc: { idType: "Passport", provider: "Smile ID", providerRef: "SMI-GH38-5521", liveness: "Pass", docMatch: "Pass", addressOk: true, result: "Pass", reviewer: "[KYC officer]" },
    nominees: [{ name: "[Nominee J1]", relationship: "Spouse", percent: 100 }],
  },
];

/* ------------------------------------------------------------------ */
/* Joining fees (VEKAT — not share capital)                            */
/* ------------------------------------------------------------------ */

export type JoiningFee = {
  id: string;
  ref: string; // member number or application reference
  name: string;
  amount: number;
  currency: "NGN" | "GBP" | "USD" | "EUR";
  channel: "stripe" | "firstbank";
  stripeId?: string;
  receipt?: string;
  paidAt: string;
  status: "Paid — Stripe" | "Receipt uploaded" | "Matched to First Bank";
  matchedBy?: string;
};

function seedFees(): JoiningFee[] {
  const rows: JoiningFee[] = [];
  MEMBERS.forEach((m, i) => {
    const diaspora = m.base === "diaspora";
    const usd = m.region === "US";
    rows.push({
      id: `JF-${String(300 + i)}`,
      ref: m.no,
      name: m.name,
      amount: diaspora ? (usd ? 13 : JOINING_FEE.gbp) : JOINING_FEE.ngn,
      currency: diaspora ? (usd ? "USD" : "GBP") : "NGN",
      channel: diaspora ? "stripe" : "firstbank",
      stripeId: diaspora ? `pi_3Q${(i * 7919).toString(36).toUpperCase()}X` : undefined,
      receipt: diaspora ? undefined : `receipt-${m.no}.jpg`,
      paidAt: m.joinedAt,
      status: diaspora ? "Paid — Stripe" : "Matched to First Bank",
      matchedBy: diaspora ? "Stripe webhook" : "[Finance officer]",
    });
  });
  rows.push(
    { id: "JF-401", ref: "HB-FC-UK-000061", name: "[Applicant F]", amount: 10, currency: "GBP", channel: "stripe", stripeId: "pi_3QF0125EURX", paidAt: "2026-09-22", status: "Paid — Stripe", matchedBy: "Stripe webhook" },
    { id: "JF-402", ref: "HB-ED-ED-000058", name: "[Applicant E]", amount: 10_000, currency: "NGN", channel: "firstbank", receipt: "receipt-APP-0128.pdf", paidAt: "2026-10-08", status: "Receipt uploaded" },
  );
  return rows;
}
export const JOINING_FEES: JoiningFee[] = seedFees();

/* ------------------------------------------------------------------ */
/* Withdrawals                                                         */
/* ------------------------------------------------------------------ */

export type Instalment = { due: string; amount: number; status: "Scheduled" | "Approved" | "Paid"; approvedBy?: string };
export type Withdrawal = {
  id: string;
  memberNo: string;
  kind: "notice" | "death";
  shares: number;
  noticeDate: string;
  status: "Notice received" | "Awaiting Board" | "Approved — paying" | "Paid" | "Declined";
  months?: number;
  schedule: Instalment[];
  decidedBy?: string;
  payTo?: string;
};
export const WITHDRAWALS: Withdrawal[] = [
  { id: "WD-0003", memberNo: "HB-ED-LA-000051", kind: "notice", shares: 40, noticeDate: "2026-05-02", status: "Notice received", schedule: [] },
  { id: "WD-0005", memberNo: "HB-ED-UK-000045", kind: "notice", shares: 30, noticeDate: "2026-09-20", status: "Notice received", schedule: [] },
  { id: "WD-0006", memberNo: "HB-ED-ED-000020", kind: "death", shares: 60, noticeDate: "2026-09-28", status: "Awaiting Board", schedule: [], payTo: "Nominees: [Nominee P1] 75% · [Nominee P2] 25% (10.1)" },
];

/* ------------------------------------------------------------------ */
/* Meetings, motions, votes, proxies                                   */
/* ------------------------------------------------------------------ */

export type Motion = { id: string; title: string; kind: "ordinary" | "bylaw"; clause?: string };
export type Vote = { motionId: string; memberNo: string; choice: "For" | "Against" | "Abstain"; channel: "Online" | "In person" | "By proxy"; proxyHolder?: string };
export type Proxy = { id: string; appointer: string; holder: string; givenAt: string };

export const MOTIONS: Motion[] = [
  { id: "MO-1", title: "Confirm the first Board and the Chairman", kind: "ordinary", clause: "17" },
  { id: "MO-2", title: "Approve the Investment Policy for the long-term portfolio", kind: "ordinary", clause: "13A.2" },
  { id: "MO-3", title: "Change bye-law 11.2: home minimum monthly from ₦5,000 to ₦6,000", kind: "bylaw", clause: "23.1" },
];

export const VOTES: Vote[] = [
  { motionId: "MO-3", memberNo: "HB-ED-ED-000012", choice: "For", channel: "Online" },
  { motionId: "MO-3", memberNo: "HB-ED-UK-000002", choice: "For", channel: "Online" },
  { motionId: "MO-3", memberNo: "HB-FC-AB-000001", choice: "Against", channel: "Online" },
  { motionId: "MO-3", memberNo: "HB-ED-ED-000005", choice: "For", channel: "Online" },
  { motionId: "MO-3", memberNo: "HB-FC-US-000004", choice: "Against", channel: "Online" },
  { motionId: "MO-2", memberNo: "HB-ED-ED-000012", choice: "For", channel: "Online" },
  { motionId: "MO-2", memberNo: "HB-FC-AB-000031", choice: "For", channel: "Online" },
  { motionId: "MO-2", memberNo: "HB-ED-UK-000045", choice: "Abstain", channel: "Online" },
];

export const PROXIES: Proxy[] = [
  { id: "PX-1", appointer: "HB-ED-UK-000045", holder: "HB-ED-ED-000012", givenAt: "2026-09-02" },
  { id: "PX-2", appointer: "HB-FC-AB-000031", holder: "HB-ED-ED-000012", givenAt: "2026-09-05" },
  { id: "PX-3", appointer: "HB-FC-US-000027", holder: "HB-ED-ED-000012", givenAt: "2026-09-10" },
  { id: "PX-4", appointer: "HB-ED-GH-000038", holder: "HB-ED-ED-000012", givenAt: "2026-09-14" },
  { id: "PX-5", appointer: "HB-FC-AB-000009", holder: "HB-ED-ED-000012", givenAt: "2026-09-18" },
  { id: "PX-6", appointer: "HB-ED-UK-000003", holder: "HB-ED-ED-000012", givenAt: "2026-09-25" },
  { id: "PX-7", appointer: "HB-ED-LA-000051", holder: "HB-ED-ED-000005", givenAt: "2026-09-26" },
];

/* ------------------------------------------------------------------ */
/* Projects and portfolio                                              */
/* ------------------------------------------------------------------ */

export type ProjectState = { id: string; checks: boolean[]; report: "Not due — nothing invested" | "Draft" | "Published"; lastReport?: string };
export const PROJECT_STATES: ProjectState[] = [
  { id: "food", checks: [false, false, false, false, false], report: "Not due — nothing invested" },
  { id: "health", checks: [false, false, false, false, false], report: "Not due — nothing invested" },
  { id: "solar", checks: [false, false, false, false, false], report: "Not due — nothing invested" },
];

/* ------------------------------------------------------------------ */
/* Settings and maker-checker                                          */
/* ------------------------------------------------------------------ */

export type BankSetting = { label: string; bank: string; accountName: string; accountNumber: string; swift?: string };
export type SettingsState = {
  banks: Record<"NGN" | "USD" | "GBP", BankSetting>;
  joiningFeeNgn: number;
  joiningFeeGbp: number;
  joiningFeePayee: string;
  sharePrice: number;
  minMonthlyNgn: number;
  minMonthlyGbp: number;
  foundingBlockNgn: number;
  foundingBlockGbp: number;
  capPct: number;
  maxProxies: number;
};

export const INITIAL_SETTINGS: SettingsState = {
  banks: {
    NGN: { label: SOCIETY_ACCOUNTS.NGN.label, bank: SOCIETY_ACCOUNTS.NGN.bank, accountName: SOCIETY_ACCOUNTS.NGN.accountName, accountNumber: SOCIETY_ACCOUNTS.NGN.accountNumber },
    USD: { label: SOCIETY_ACCOUNTS.USD.label, bank: SOCIETY_ACCOUNTS.USD.bank, accountName: SOCIETY_ACCOUNTS.USD.accountName, accountNumber: SOCIETY_ACCOUNTS.USD.accountNumber, swift: SOCIETY_ACCOUNTS.USD.extra.value },
    GBP: { label: SOCIETY_ACCOUNTS.GBP.label, bank: SOCIETY_ACCOUNTS.GBP.bank, accountName: SOCIETY_ACCOUNTS.GBP.accountName, accountNumber: SOCIETY_ACCOUNTS.GBP.accountNumber, swift: SOCIETY_ACCOUNTS.GBP.extra.value },
  },
  joiningFeeNgn: JOINING_FEE.ngn,
  joiningFeeGbp: JOINING_FEE.gbp,
  joiningFeePayee: JOINING_FEE.payee,
  sharePrice: SHARE_PRICE_NGN,
  minMonthlyNgn: MIN_MONTHLY.ngn,
  minMonthlyGbp: MIN_MONTHLY.gbp,
  foundingBlockNgn: FOUNDING_BLOCK.ngn,
  foundingBlockGbp: FOUNDING_BLOCK.gbp,
  capPct: MAX_HOLDING_SHARE * 100,
  maxProxies: MAX_PROXIES,
};

export const RATES = EXAMPLE_RATES;

export type PendingChange = {
  id: string;
  key: string;
  label: string;
  before: string;
  after: string;
  /** Raw value to apply when approved (display text is in before/after). */
  value?: string;
  maker: string; // person
  makerRole: string;
  at: string;
  status: "Pending" | "Approved" | "Rejected" | "Withdrawn";
  checker?: string;
};

export const PENDING_CHANGES: PendingChange[] = [
  {
    id: "CH-0012",
    key: "banks.NGN.accountNumber",
    label: "UBA naira account — account number",
    before: SOCIETY_ACCOUNTS.NGN.accountNumber,
    after: "1023 4567 89",
    maker: "[Admin A]",
    makerRole: "Super admin",
    at: "12 Oct 2026, 16:20",
    status: "Pending",
  },
];

export type StaffUser = { id: string; name: string; role: string; heldBy: string; twoFactor: boolean };
export const STAFF: StaffUser[] = ROLES.map((r) => ({ id: r.id, name: r.person, role: r.title, heldBy: r.heldBy, twoFactor: true }));

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

export type LogEntry = { id: string; at: string; who: string; role: string; action: string; entity: string; before: string; after: string };

export const LOG: LogEntry[] = [
  { id: "L-9", at: "12 Oct 2026, 16:20", who: "[Admin A]", role: "Super admin", action: "Proposed setting change", entity: "banks.NGN.accountNumber", before: "[UBA naira account number — to be confirmed]", after: "1023 4567 89 (pending second approval)" },
  { id: "L-8", at: "12 Oct 2026, 09:05", who: "System", role: "Statement import", action: "Auto-matched bank line", entity: "BL-2004", before: "Suspense", after: "Matched — to confirm · HB-FC-AB-000031" },
  { id: "L-7", at: "8 Oct 2026, 11:42", who: "[Applicant E]", role: "Applicant", action: "Uploaded joining-fee receipt", entity: "JF-402", before: "—", after: "Receipt uploaded" },
  { id: "L-6", at: "5 Oct 2026, 10:15", who: "[Finance officer]", role: "Finance officer", action: "Confirmed payment and issued shares", entity: "BL-1027 · HB-FC-AB-000031", before: "Matched — to confirm", after: "Credited · 5 shares" },
  { id: "L-5", at: "28 Sep 2026, 14:02", who: "[KYC officer]", role: "KYC officer", action: "Approved application", entity: "APP-0125", before: "In review", after: "Approved (fee due) · HB-FC-UK-000061" },
  { id: "L-4", at: "15 Sep 2026, 12:30", who: "[Finance officer]", role: "Finance officer", action: "Share issue blocked by 20% cap", entity: "BL-1020 · HB-FC-AB-000001", before: "—", after: "₦150,000 held as unallocated credit" },
  { id: "L-3", at: "10 Sep 2026, 09:58", who: "[KYC officer]", role: "KYC officer", action: "Refused application", entity: "APP-0120", before: "In review", after: "Refused · under 18 (5.1)" },
  { id: "L-2", at: "1 Jul 2026, 15:10", who: "[Board member]", role: "Board member", action: "Approved share transfer", entity: "TR-0004", before: "Awaiting Board", after: "15 shares HB-FC-AB-000014 → HB-FC-AB-000031" },
  { id: "L-1", at: "1 Jul 2026, 15:12", who: "[Board member]", role: "Board member", action: "Recorded end of membership", entity: "HB-FC-AB-000014", before: "Active", after: "Withdrawn (9.1c)" },
];
