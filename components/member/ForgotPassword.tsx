"use client";

import Link from "next/link";
import { useState } from "react";
import { MailIcon } from "@/components/ui/Icons";
import { Card, btnPrimary, textLink } from "./bits";

const inputClass =
  "block min-h-12 w-full rounded-xl border border-line-strong/70 bg-page px-4 py-2.5 text-[16px] text-ink focus:border-forest-800 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-gold aria-[invalid=true]:border-danger";

/**
 * Asks for the address to send a reset link to.
 *
 * Once sent, it says the same thing whether or not that address belongs to a member. Telling
 * someone "no account with that email" would turn this page into a way to find out who has
 * registered, and the membership list is not public.
 */
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/member/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setSent(true);
        return;
      }
      setError(data.error || "Could not send the email just now. Please try again.");
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-[460px] px-[clamp(16px,4vw,28px)] pt-[clamp(28px,5vw,56px)]">
        <Card>
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-mist text-forest-800">
            <MailIcon size={24} />
          </span>
          <h1 className="mt-4 mb-0 text-[26px] text-forest-800">Check your email</h1>
          <p className="mt-2 mb-0 text-[15.5px] text-body">
            If <strong>{email}</strong> belongs to a member, we have sent a link for choosing a new password. It works once
            and expires in an hour.
          </p>
          <p className="mt-4 mb-0 text-[14.5px] text-muted">
            Nothing after a few minutes? Check your spam folder, and that you used the address you registered with.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/app" className={btnPrimary}>
              Back to sign in
            </Link>
            <button type="button" onClick={() => setSent(false)} className={textLink}>
              Use a different address
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[460px] px-[clamp(16px,4vw,28px)] pt-[clamp(28px,5vw,56px)]">
      <Card>
        <h1 className="m-0 text-[28px] text-forest-800">Forgotten your password?</h1>
        <p className="mt-2 mb-6 text-[15.5px] text-body">
          Enter the email address you registered with and we will send you a link to choose a new one.
        </p>

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
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "email-error" : undefined}
            className={inputClass}
          />
          {error ? (
            <p id="email-error" role="alert" className="mt-2 mb-0 text-[14px] font-semibold text-danger">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className={`${btnPrimary} mt-6 w-full`}>
            {busy ? "Sending…" : "Send me a link"}
          </button>
        </form>

        <p className="mt-5 mb-0 text-[14.5px] text-muted">
          Remembered it?{" "}
          <Link href="/app" className={textLink}>
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
