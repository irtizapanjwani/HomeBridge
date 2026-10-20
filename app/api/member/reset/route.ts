import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { createMemberSession, hashPassword, isMemberAuthConfigured, passwordProblem } from "@/lib/member-auth";
import { completeReset, memberForResetToken } from "@/lib/password-reset";

/**
 * Sets a new password from a reset link.
 *
 * The token is the only proof of identity here, so it is checked against the database on this
 * request rather than trusted from the page that rendered the form: a page can be left open for
 * hours, and the token may have been used or replaced in the meantime.
 */
export async function POST(req: Request) {
  if (!isMemberAuthConfigured() || !isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign-in is not configured" }, { status: 503 });
  }

  let token = "";
  let password = "";
  let confirm = "";
  try {
    const body = (await req.json()) as { token?: unknown; password?: unknown; passwordConfirm?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
    // Never trimmed: a password is used exactly as typed.
    password = typeof body.password === "string" ? body.password : "";
    confirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const problem = passwordProblem(password);
  if (problem) {
    return NextResponse.json({ ok: false, error: problem, field: "password" }, { status: 422 });
  }
  if (password !== confirm) {
    return NextResponse.json({ ok: false, error: "Both passwords must match.", field: "passwordConfirm" }, { status: 422 });
  }

  try {
    const member = await memberForResetToken(token);
    if (!member) {
      return NextResponse.json(
        { ok: false, error: "That link has expired or has already been used. Please ask for a new one.", expired: true },
        { status: 400 },
      );
    }

    const hash = await hashPassword(password);
    // Sets the password and retires the token together, so the emailed link cannot be used twice.
    const done = await completeReset(member.reference, hash);
    if (!done) {
      return NextResponse.json({ ok: false, error: "Could not set your password" }, { status: 502 });
    }

    // Signed in straight away: they have just proved they hold the address and chosen a password,
    // so sending them to a sign-in form to type it again achieves nothing.
    await createMemberSession(member.reference);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never return the error text: a Mongo error can carry the connection string.
    console.error("[reset] could not set the password:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not set your password" }, { status: 502 });
  }
}
