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
  // Brief Phase 2: "Login by email with one-time code". The password still works for those who prefer it.
  const [mode, setMode] = useState<"password" | "code">("password");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");

  async function post(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return { ok: res.ok && data.ok !== false, error: data.error };
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post("/api/member/code", { email });
      if (!r.ok) return setError(r.error || "Could not send a code. Try again in a moment.");
      setCodeSent(true);
      setCode("");
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post("/api/member/code/verify", { email, code });
      if (r.ok) {
        window.location.href = "/app";
        return;
      }
      setError(r.error || "That code is not right or has expired.");
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

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
        <p className="mt-2 mb-5 text-[15.5px] text-body">
          {mode === "password"
            ? "Use the email address and password you set when you registered."
            : "We email you a 6-digit code. No password needed."}
        </p>

        {configured ? (
          <div role="tablist" aria-label="How to sign in" className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-line bg-page p-1">
            {(
              [
                ["password", "Password"],
                ["code", "Email me a code"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => {
                  setMode(id);
                  setError("");
                }}
                className={`min-h-10 rounded-full text-[14.5px] font-semibold transition ${mode === id ? "bg-forest-800 text-cream" : "text-forest-800 hover:bg-mist"}`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {configured && mode === "code" ? (
          codeSent ? (
            <form onSubmit={verifyCode} noValidate>
              <p className="mt-0 mb-4 rounded-xl bg-mist px-4 py-3 text-[14.5px] text-forest-900">
                If <strong>{email}</strong> belongs to an account, a code is on its way. It works for 10 minutes.
              </p>
              <label htmlFor="code" className="mb-1.5 block text-[15px] font-semibold text-ink">
                6-digit code
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                aria-invalid={!!error}
                className={`${inputClass} text-center text-[22px] tracking-[0.4em]`}
              />
              {error && (
                <p role="alert" className="mt-3 text-[14.5px] font-medium text-danger">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy || code.length !== 6} className={`${btnPrimary} mt-6 w-full`}>
                {busy ? "Checking…" : "Sign in"}
              </button>
              <p className="mt-4 mb-0 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                <button type="button" disabled={busy} onClick={() => void sendCode()} className="font-semibold text-forest-800 underline underline-offset-[3px]">
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setError("");
                  }}
                  className="font-semibold text-forest-800 underline underline-offset-[3px]"
                >
                  Use a different email
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={sendCode} noValidate>
              <label htmlFor="code-email" className="mb-1.5 block text-[15px] font-semibold text-ink">
                Email address
              </label>
              <input
                id="code-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                className={inputClass}
              />
              {error && (
                <p role="alert" className="mt-3 text-[14.5px] font-medium text-danger">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy || !email} className={`${btnPrimary} mt-6 w-full`}>
                {busy ? "Sending…" : "Email me a code"}
              </button>
            </form>
          )
        ) : configured ? (
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

            <div className="mt-4 mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4">
              <label htmlFor="password" className="block text-[15px] font-semibold text-ink">
                Password
              </label>
              <Link href="/forgot" className="text-[14px] font-semibold text-forest-800 underline underline-offset-[3px]">
                Forgotten your password?
              </Link>
            </div>
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
          <span>Nobody from HomeBridge will ever ask you for your password. We can only ever send you a link to set a new one.</span>
        </p>
      </Card>
    </div>
  );
}
