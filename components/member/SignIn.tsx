"use client";

import Link from "next/link";
import { useState } from "react";
import { LockIcon } from "@/components/ui/Icons";
import { Card, btnPrimary, textLink } from "./bits";

export function MemberSignIn({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const inputClass =
    "block min-h-12 w-full rounded-xl border border-line-strong/70 bg-page px-4 py-2.5 text-[16px] text-ink focus:border-forest-800 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-gold aria-[invalid=true]:border-danger";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = "/app";
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Those details don't match an account.");
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  return (
    <div className="mx-auto max-w-[460px] px-[clamp(16px,4vw,28px)] pt-[clamp(28px,5vw,56px)]">
      <Card>
        <h1 className="m-0 text-[28px] text-forest-800">Sign in</h1>
        <p className="mt-2 mb-6 text-[15.5px] text-body">Use the email address and password you set when you registered.</p>

        {configured ? (
          <form onSubmit={submit} noValidate>
            <label htmlFor="email" className="mb-1.5 block text-[15px] font-semibold text-ink">
              Email address
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
              className={inputClass}
            />

            <label htmlFor="password" className="mt-4 mb-1.5 block text-[15px] font-semibold text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "signin-error" : undefined}
              className={inputClass}
            />

            {error && (
              <p id="signin-error" role="alert" className="mt-3 text-[14.5px] font-medium text-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy || !email || !password} className={`${btnPrimary} mt-6 w-full`}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <p role="alert" className="rounded-2xl border border-danger/30 bg-[#fdf6f3] px-4 py-3 text-[15px] text-danger">
            Sign-in isn&apos;t set up yet. Please try again later.
          </p>
        )}

        <p className="mt-6 mb-0 text-[15px] text-body">
          Not registered yet?{" "}
          <Link href="/register" className={textLink}>
            Apply for membership
          </Link>
        </p>

        <p className="mt-5 mb-0 flex gap-2.5 text-[13.5px] leading-snug text-muted">
          <LockIcon size={18} className="mt-0.5 shrink-0 text-forest-700" />
          <span>Nobody from HomeBridge will ever ask you for your password. If you have forgotten it, contact the office.</span>
        </p>
      </Card>
    </div>
  );
}
