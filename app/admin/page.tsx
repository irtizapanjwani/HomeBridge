import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import { ToastProvider } from "@/components/ui/Toast";

// Route-only page: nothing on the public site links here, and it is kept out of search engines.
export const metadata: Metadata = {
  title: "Admin back office",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminApp />
    </ToastProvider>
  );
}
