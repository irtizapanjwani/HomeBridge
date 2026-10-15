"use client";

import { useState } from "react";
import { LockIcon } from "@/components/ui/Icons";
import { LogoMark } from "@/components/ui/Logo";

export function SignIn({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      setError(res.status === 429 ? "Too many attempts. Wait a minute and try again." : "That password is not right.");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  return (
    <main id="main" className="grid min-h-screen place-items-center bg-page px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[24px] border border-line bg-paper px-6 py-8 sm:px-9">
        <LogoMark size={40} />
        <h1 className="mt-5 text-[26px] text-forest-800">Back office</h1>
        <p className="mt-1 mb-6 text-[15px] text-body">Sign in to manage registrations.</p>

        {configured ? (
          <form onSubmit={submit} noValidate>
            <label htmlFor="password" className="mb-1.5 block text-[15px] font-semibold text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "password-error" : undefined}
              className="block min-h-12 w-full rounded-xl border border-line-strong/70 bg-page px-4 py-2.5 text-[16px] text-ink focus:border-forest-800 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-gold aria-[invalid=true]:border-danger"
            />
            {error && (
              <p id="password-error" role="alert" className="mt-2 text-[14px] font-medium text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !password}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-forest-800 px-7 text-[16px] font-semibold text-cream hover:bg-forest-900 disabled:opacity-60"
            >
              {busy ? "Checking…" : "Sign in"}
            </button>
          </form>
        ) : (
          <p role="alert" className="rounded-2xl border border-danger/30 bg-[#fdf6f3] px-4 py-3 text-[15px] text-danger">
            No admin password is set. Add <code>ADMIN_PASSWORD</code> to the environment variables and redeploy.
          </p>
        )}

        <p className="mt-6 flex gap-2.5 text-[13.5px] leading-snug text-muted">
          <LockIcon size={18} className="mt-0.5 shrink-0 text-forest-700" />
          <span>This page holds members&apos; personal details. Don&apos;t share the password, and sign out on a shared computer.</span>
        </p>
      </div>
    </main>
  );
}
