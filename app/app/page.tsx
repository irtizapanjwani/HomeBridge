import { Account } from "@/components/member/Account";
import { MemberSignIn } from "@/components/member/SignIn";
import { loadAccountView } from "./load-view";

// Always per request: it shows one signed-in member's own record.
export const dynamic = "force-dynamic";

export default async function MemberAccountPage() {
  const { view, configured } = await loadAccountView();
  if (!view) return <MemberSignIn configured={configured} />;
  return <Account view={view} />;
}
