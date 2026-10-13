// Sample data for the admin back office. Replace with real API calls when the backend exists.

export type KycStatus = "Needs review" | "Passed" | "Info requested" | "Approved" | "Declined";

export type Applicant = {
  id: string;
  name: string;
  memberType: "Home" | "Diaspora" | "Group" | "Professional";
  chapter: "Edo" | "Abuja" | "UK";
  check: string;
  status: KycStatus;
  liveness: "Pass" | "Fail" | "Not required";
  docMatch: "Pass" | "Fail";
  route: string;
  routeOk: boolean;
  docs: string[];
  memberNo?: string;
  note?: string;
};

export type Payment = {
  id: string;
  amount: string;
  account: "UBA naira account" | "USD domiciliary account" | "GBP domiciliary account";
  ref: string;
  match: string | null;
  type: "Shares" | "Joining fee" | "—";
  status: "Unconfirmed" | "Confirmed";
};

export type Approval = { id: string; what: string; maker: string; kind: "release" | "nominee" | "cashout" };

export type LogEntry = { when: string; who: string; what: string };

export const ROLES = [
  { id: "super", label: "Super-admin", canAct: true },
  { id: "finance", label: "Finance officer", canAct: true },
  { id: "kyc", label: "KYC officer", canAct: true },
  { id: "chapter", label: "Chapter lead", canAct: false },
  { id: "board", label: "Board member", canAct: true },
  { id: "auditor", label: "Auditor (read-only)", canAct: false },
] as const;
export type RoleId = (typeof ROLES)[number]["id"];

export const APPLICANTS: Applicant[] = [
  {
    id: "a1",
    name: "[Applicant A]",
    memberType: "Diaspora",
    chapter: "UK",
    check: "Passport + selfie",
    status: "Needs review",
    liveness: "Pass",
    docMatch: "Pass",
    route: "Family land in Edo — evidence needed",
    routeOk: false,
    docs: ["Passport", "Selfie", "Address"],
  },
  {
    id: "a2",
    name: "[Applicant B]",
    memberType: "Home",
    chapter: "Edo",
    check: "BVN",
    status: "Passed",
    liveness: "Pass",
    docMatch: "Pass",
    route: "Lives in Edo State",
    routeOk: true,
    docs: ["BVN record", "Selfie", "Address"],
  },
  {
    id: "a3",
    name: "[Applicant C]",
    memberType: "Group",
    chapter: "Abuja",
    check: "CAC + rep BVN",
    status: "Info requested",
    liveness: "Not required",
    docMatch: "Pass",
    route: "Registered group in FCT — rep letter outstanding",
    routeOk: false,
    docs: ["CAC certificate", "Rep BVN", "Rep letter"],
    note: "Asked for signed letter naming the group representative.",
  },
  {
    id: "a4",
    name: "[Applicant D]",
    memberType: "Professional",
    chapter: "UK",
    check: "NR-BVN",
    status: "Passed",
    liveness: "Pass",
    docMatch: "Pass",
    route: "Edo-born, lives in UK",
    routeOk: true,
    docs: ["NR-BVN record", "Selfie", "Address"],
  },
];

export const PAYMENTS: Payment[] = [
  { id: "p1", amount: "₦5,000", account: "UBA naira account", ref: "HB-EDO-000123", match: "[Member A]", type: "Shares", status: "Unconfirmed" },
  { id: "p2", amount: "£25.00", account: "GBP domiciliary account", ref: "HB-UK-000045", match: "[Member B]", type: "Shares", status: "Unconfirmed" },
  { id: "p3", amount: "₦20,000", account: "UBA naira account", ref: "HBEDO123 (typo)", match: null, type: "—", status: "Unconfirmed" },
];

export const MEMBERS_FOR_MATCHING = [
  { no: "HB-EDO-000123", name: "[Member A]" },
  { no: "HB-UK-000045", name: "[Member B]" },
  { no: "HB-ABJ-000078", name: "[Member C]" },
];

export const APPROVALS: Approval[] = [
  { id: "ap1", what: "Release ₦[amount] to Food processing — milestone 2", maker: "Finance officer", kind: "release" },
  { id: "ap2", what: "Change of nominee for HB-ABJ-000078", maker: "KYC officer", kind: "nominee" },
  { id: "ap3", what: "Share cash-out request HB-UK-000012 (route to board)", maker: "Finance officer", kind: "cashout" },
];

export const REPORTS: { name: string; columns: string[]; rows: string[][] }[] = [
  {
    name: "Members by chapter and type",
    columns: ["Chapter", "Home", "Diaspora", "Founding", "Professional", "Group"],
    rows: [
      ["Edo", "[#]", "[#]", "[#]", "[#]", "[#]"],
      ["Abuja", "[#]", "[#]", "[#]", "[#]", "[#]"],
      ["UK", "[#]", "[#]", "[#]", "[#]", "[#]"],
    ],
  },
  { name: "Contributions", columns: ["Month", "Naira (₦)", "Domiciliary (£/$/€)"], rows: [["[Month]", "[₦]", "[£]"]] },
  { name: "Shareholdings", columns: ["Member no.", "Shares", "% of total"], rows: [["HB-EDO-000123", "60", "[%]"]] },
  { name: "Arrears", columns: ["Member no.", "Months behind", "Amount"], rows: [["[Member no.]", "[#]", "[₦]"]] },
  { name: "Withdrawals", columns: ["Member no.", "Notice given", "Eligible from"], rows: [["[Member no.]", "[date]", "[date]"]] },
  { name: "Joining fees", columns: ["Member no.", "Amount", "Paid on", "Method"], rows: [["HB-EDO-000123", "₦10,000", "12 Aug 2027", "Card"]] },
];

export const LOG: LogEntry[] = [
  { when: "[date] 10:42", who: "KYC officer", what: "Approved HB-EDO-000123 (BVN pass)" },
  { when: "[date] 10:15", who: "Finance", what: "Matched ₦5,000 to HB-EDO-000123" },
  { when: "[date] 09:58", who: "Super-admin", what: "Published Food processing monthly update" },
  { when: "[date] 09:30", who: "Board member", what: "Approved milestone 1 release (second signer)" },
];
