import type { Metadata } from "next";
import { ProfilePage } from "@/components/member/ProfilePage";
import { MemberSignIn } from "@/components/member/SignIn";
import { loadAccountView } from "../load-view";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

/** For members and applicants alike. */
export default async function Profile() {
  const { view, configured } = await loadAccountView(["documents"]);
  if (!view) return <MemberSignIn configured={configured} />;
  return <ProfilePage view={view} />;
}
