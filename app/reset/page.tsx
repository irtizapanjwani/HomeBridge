import type { Metadata } from "next";
import { ResetPassword } from "@/components/member/ResetPassword";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

// The token arrives in the query string, so this is rendered per request.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <main id="main" className="pb-[clamp(40px,8vw,80px)]">
      <ResetPassword token={token} />
    </main>
  );
}
