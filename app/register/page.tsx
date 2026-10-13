import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { RegisterApp } from "@/components/register/RegisterApp";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Apply to join HomeBridge Cooperative in six short steps. No password and nothing to pay today: the joining fee is requested only once you are approved.",
  alternates: { canonical: "/register" },
  robots: { index: true, follow: true },
};

export default function RegisterPage() {
  return (
    <ToastProvider>
      <RegisterApp />
    </ToastProvider>
  );
}
