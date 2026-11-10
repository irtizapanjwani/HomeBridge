import { Account } from "@/components/member/Account";
import { MemberSignIn } from "@/components/member/SignIn";
import { currentMemberRef, isMemberAuthConfigured } from "@/lib/member-auth";
import { isDbConfigured } from "@/lib/db";
import { buildAccountView } from "@/lib/member-view";

// Always per request: it shows one signed-in member's own record.
export const dynamic = "force-dynamic";

export default async function MemberAccountPage() {
  const ref = isDbConfigured() ? await currentMemberRef() : null;
  if (!ref) return <MemberSignIn configured={isMemberAuthConfigured() && isDbConfigured()} />;

  const view = await buildAccountView(ref);
  if (!view) return <MemberSignIn configured={isMemberAuthConfigured() && isDbConfigured()} />;

  return <Account view={view} />;
}
