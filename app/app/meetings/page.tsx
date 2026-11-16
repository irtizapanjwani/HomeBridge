import type { Metadata } from "next";
import { MeetingsPage } from "@/components/member/MeetingsPage";
import { MembersOnly } from "@/components/member/PortalPage";
import { MemberSignIn } from "@/components/member/SignIn";
import { loadAccountView } from "../load-view";

export const metadata: Metadata = { title: "Meetings" };
export const dynamic = "force-dynamic";

export default async function Meetings() {
  const { view, configured } = await loadAccountView(["meeting", "votes"]);
  if (!view) return <MemberSignIn configured={configured} />;
  if (!view.membership) return <MembersOnly what="Meetings and votes" />;
  return <MeetingsPage meeting={view.meeting ?? null} motions={view.motions ?? []} />;
}
