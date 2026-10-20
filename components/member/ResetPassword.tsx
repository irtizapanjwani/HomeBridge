"use client";

import Link from "next/link";
import { useState } from "react";
import { LockIcon } from "@/components/ui/Icons";
import { MIN_PASSWORD_LENGTH } from "@/lib/register-data";
import { Card, btnPrimary, textLink } from "./bits";

const inputClass =
  "block min-h-12 w-full rounded-xl border border-line-strong/70 bg-page px-4 py-2.5 text-[16px] text-ink focus:border-forest-800 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-gold aria-[invalid=true]:border-danger";

/**
 * Chooses a new password from an emailed link.
 *
 * The token comes from the URL and is checked by the server on submit, not here: this page may sit
 * open for hours, and the link may have been used or replaced in the meantime.
 */
export function ResetPassword({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  const [dead, setDead] = useState(!token);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setField("");
    try {
      const res = await fetch("/api/member/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirm: confirm }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; field?: string; expired?: boolean };
      if (res.ok && data.ok) {
        // Signed in by the server already, so they land in their account rather than a sign-in form.
        window.location.href = "/app";
        return;
      }
      if (data.expired) {
        setDead(true);
        return;
      }
      setError(data.error || "Could not set your password. Please try again.");
      setField(data.field || "");
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (dead) {
    return (
      <div className="mx-auto max-w-[460px] px-[clamp(16px,4vw,28px)] pt-[clamp(28px,5vw,56px)]">
        <Card>
          <h1 className="m-0 text-[26px] text-forest-800">This link has expired</h1>
          <p className="mt-2 mb-0 text-[15.5px] text-body">
            A reset link works once and lasts an hour. Ask for a new one and it will arrive in a moment.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/forgot" className={btnPrimary}>
              Send me a new link
            </Link>
            <Link href="/app" className={textLink}>
              Back to sign in
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[460px] px-[clamp(16px,4vw,28px)] pt-[clamp(28px,5vw,56px)]">
      <Card>
        <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-mist text-forest-800">
          <LockIcon size={23} />
        </span>
        <h1 className="mt-4 mb-0 text-[28px] text-forest-800">Choose a new password</h1>
        <p className="mt-2 mb-6 text-[15.5px] text-body">
          At least {MIN_PASSWORD_LENGTH} characters. A few words together is easiest to remember.
        </p>

        <form onSubmit={submit} noValidate>
          <label htmlFor="password" className="mb-1.5 block text-[15px] font-semibold text-ink">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={field === "password"}
            className={inputClass}
          />

          <label htmlFor="passwordConfirm" className="mt-4 mb-1.5 block text-[15px] font-semibold text-ink">
            Confirm new password
          </label>
          <input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={field === "passwordConfirm"}
            aria-describedby={error ? "reset-error" : undefined}
            className={inputClass}
          />

          {error ? (
            <p id="reset-error" role="alert" className="mt-3 mb-0 text-[14px] font-semibold text-danger">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className={`${btnPrimary} mt-6 w-full`}>
            {busy ? "Saving…" : "Save and sign in"}
          </button>
        </form>
      </Card>
    </div>
  );
}
