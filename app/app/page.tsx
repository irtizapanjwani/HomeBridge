import { Account, type AccountView } from "@/components/member/Account";
import { MemberSignIn } from "@/components/member/SignIn";
import { currentMemberRef, findMemberByRef, isMemberAuthConfigured } from "@/lib/member-auth";
import { isDbConfigured } from "@/lib/db";

// Always per request: it shows one signed-in member's own record.
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  home: "Home member",
  diaspora: "Diaspora member",
  founding: "Founding member",
  professional: "Professional member",
  group: "Group member",
};

const ID_LABEL: Record<string, string> = {
  bvn: "BVN",
  nin: "NIN",
  nrbvn: "Non-Resident BVN",
  passport: "Passport",
};

const PAYMENT_METHOD: Record<string, string> = {
  bank: "Bank transfer",
  card: "Card payment",
};

const date = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : v;

export default async function MemberAccountPage() {
  const ref = isDbConfigured() ? await currentMemberRef() : null;
  if (!ref) return <MemberSignIn configured={isMemberAuthConfigured() && isDbConfigured()} />;

  const m = await findMemberByRef(ref);
  if (!m) return <MemberSignIn configured={isMemberAuthConfigured() && isDbConfigured()} />;

  const view: AccountView = {
    reference: m.reference,
    firstName: m.firstName || m.fullName.trim().split(/\s+/)[0] || "",
    fullName: [m.title, m.fullName].filter(Boolean).join(" ").trim(),
    status: m.status,
    supporter: m.supporter,
    memberType: TYPE_LABEL[m.memberType] ?? "",
    chapter: m.chapter,
    submittedAt: m.submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    email: m.email,
    whatsapp: m.whatsapp || m.contact,
    livesIn: [m.city, m.country === "Nigeria" ? m.state : "", m.country].filter(Boolean).join(", "),
    idLabel: ID_LABEL[m.idChoice] ?? "",
    nominees: m.nominees.map((n) => ({ name: n.name, relationship: n.relationship, share: n.share })),
    payment: m.payment
      ? {
          claimed: m.payment.status === "Claimed",
          verified: m.payment.status === "Verified",
          method: PAYMENT_METHOD[m.payment.method] ?? m.payment.method,
          datePaid: date(m.payment.datePaid),
          reference: m.payment.reference,
        }
      : null,
  };

  return <Account view={view} />;
}
