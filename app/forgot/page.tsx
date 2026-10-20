import type { Metadata } from "next";
import { ForgotPassword } from "@/components/member/ForgotPassword";

export const metadata: Metadata = {
  title: "Forgotten your password?",
  // A reset page has nothing to offer a search engine and should not be a landing page.
  robots: { index: false, follow: false },
};

export default function ForgotPage() {
  return (
    <main id="main" className="pb-[clamp(40px,8vw,80px)]">
      <ForgotPassword />
    </main>
  );
}
