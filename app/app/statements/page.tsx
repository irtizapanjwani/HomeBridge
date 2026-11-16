import type { Metadata } from "next";
import { MemberSignIn } from "@/components/member/SignIn";
import { MembersOnly } from "@/components/member/PortalPage";
import { StatementsPage } from "@/components/member/StatementsPage";
import { loadAccountView } from "../load-view";

export const metadata: Metadata = { title: "Statements" };
export const dynamic = "force-dynamic";

export default async function Statements() {
  const { view, configured } = await loadAccountView();
  if (!view) return <MemberSignIn configured={configured} />;
  if (!view.membership || !view.contributions) return <MembersOnly what="Statements" />;
  return <StatementsPage c={view.contributions} memberNo={view.membership.memberNo} />;
}
