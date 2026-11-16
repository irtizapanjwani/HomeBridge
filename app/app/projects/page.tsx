import type { Metadata } from "next";
import { MembersOnly } from "@/components/member/PortalPage";
import { ProjectsPage } from "@/components/member/ProjectsPage";
import { MemberSignIn } from "@/components/member/SignIn";
import { loadAccountView } from "../load-view";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function Projects() {
  const { view, configured } = await loadAccountView();
  if (!view) return <MemberSignIn configured={configured} />;
  if (!view.membership) return <MembersOnly what="Projects" />;
  return <ProjectsPage ideas={view.ideas ?? []} />;
}
