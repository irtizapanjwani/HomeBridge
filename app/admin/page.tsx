import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import { SignIn } from "@/components/admin/SignIn";
import { ToastProvider } from "@/components/ui/Toast";
import { isAuthConfigured, isSignedIn } from "@/lib/admin-auth";
import { listApplications } from "@/lib/applications";
import { isDbConfigured } from "@/lib/db";
import type { Application } from "@/lib/admin-data";

// Route-only page: nothing on the public site links here, and it is kept out of search engines.
export const metadata: Metadata = {
  title: "Admin back office",
  robots: { index: false, follow: false, nocache: true },
};

// Always rendered per request: it is behind a session and shows live registrations.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isSignedIn())) {
    return <SignIn configured={isAuthConfigured()} />;
  }

  let applications: Application[] = [];
  let dbError = false;
  if (isDbConfigured()) {
    try {
      applications = await listApplications();
    } catch (err) {
      console.error("[admin] could not read applications:", err instanceof Error ? err.message : "unknown error");
      dbError = true;
    }
  }

  return (
    <ToastProvider>
      <AdminApp initialApps={applications} dbConnected={isDbConfigured() && !dbError} />
    </ToastProvider>
  );
}
