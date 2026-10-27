// Outgoing email, used for the registration confirmation.
//
// Sent through Resend's HTTP API rather than its npm package, so there is nothing extra to install
// and nothing to configure on Vercel beyond the variables below.
//
// RESEND_API_KEY is a server secret and is never sent to the browser. Until a sending domain is
// verified in Resend, leave EMAIL_FROM unset: Resend's own test sender is used, which can only
// deliver to the address that owns the Resend account. Once a domain is verified, set
// EMAIL_FROM="HomeBridge Cooperative <no-reply@vekat.org>" and it delivers to anyone.

import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Resend's shared test sender. Deliverable only to the Resend account's own address. */
const TEST_FROM = "onboarding@resend.dev";

const apiKey = process.env.RESEND_API_KEY;

export const isEmailConfigured = () => Boolean(apiKey);

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export type Attachment = {
  filename: string;
  content: Uint8Array | Buffer;
};

type SendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Attachment[];
};

/**
 * Sends one email. Never throws: a mail failure must not fail the thing that triggered it, so the
 * caller gets a result to log and the member's application still stands.
 */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };

  const from = process.env.EMAIL_FROM?.trim() || TEST_FROM;
  const bcc = process.env.EMAIL_BCC?.trim() || "";
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || "";

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(bcc ? { bcc: [bcc] } : {}),
        // Resend takes attachment bytes base64-encoded.
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.from(a.content).toString("base64"),
              })),
            }
          : {}),
        // A no-reply sender has no mailbox behind it, so replies are pointed at one that does.
        ...(replyTo ? { reply_to: [replyTo] } : {}),
      }),
    });

    const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok) {
      // Resend's message names the address or domain it refused, which is what makes a bad
      // EMAIL_FROM debuggable. It carries no member data, so it is safe to log.
      return { ok: false, error: data?.message || `Resend returned ${res.status}` };
    }
    return { ok: true, id: data?.id || "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ConfirmationInput = {
  to: string;
  firstName: string;
  reference: string;
  /** Supporters pay nothing, so they get a different closing line. */
  supporter: boolean;
  /** The fee as the form showed it, e.g. "£10" or "₦10,000". */
  fee?: string;
  /** What the applicant told us about their payment, if anything. */
  paymentMethod?: string;
  paymentReference?: string;
};

/**
 * The email a member gets the moment their application is stored.
 *
 * It carries the reference and nothing sensitive: no date of birth, no ID choice, no nominees.
 * Anyone who later forwards it, or leaves it open on a shared screen, gives nothing away.
 */
export async function sendApplicationConfirmation(input: ConfirmationInput): Promise<SendResult> {
  const name = input.firstName.trim() || "there";
  const ref = input.reference;
  const payRef = input.paymentReference?.trim() || "";

  const feeLine = input.supporter
    ? {
        text: `There is nothing to pay. We will send you news a few times a year, and invitations to open events.`,
        html: `There is nothing to pay. We will send you news a few times a year, and invitations to open events.`,
      }
    : {
        text: `You told us you paid the joining fee${input.fee ? ` of ${input.fee}` : ""}${payRef ? `, with the reference ${payRef}` : ""}. We will confirm it against our account. There is nothing further for you to do.`,
        html: `You told us you paid the joining fee${input.fee ? ` of <strong>${esc(input.fee)}</strong>` : ""}${payRef ? `, with the reference <strong>${esc(payRef)}</strong>` : ""}. We will confirm it against our account. There is nothing further for you to do.`,
      };

  const text = [
    `Hello ${name},`,
    ``,
    input.supporter
      ? `Thank you for joining the HomeBridge Cooperative Supporter list.`
      : `Thank you for applying to join HomeBridge Cooperative. We have your application.`,
    ``,
    `Your reference: ${ref}`,
    `Please keep it. Quote it in any message to us about your membership.`,
    ``,
    feeLine.text,
    ``,
    input.supporter
      ? `You can leave the list at any time. Just message us.`
      : `A membership officer reviews your application. We decide within 30 days, and aim for 2 working days.`,
    ``,
    `HomeBridge Cooperative`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1D201C;line-height:1.6">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFDF7;border-radius:12px;border:1px solid #E2DED2">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px">Hello ${esc(name)},</p>
      <p style="margin:0 0 16px">${
        input.supporter
          ? "Thank you for joining the <strong>HomeBridge Cooperative</strong> Supporter list."
          : "Thank you for applying to join <strong>HomeBridge Cooperative</strong>. We have your application."
      }</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F3F1EA;border-radius:8px">
        <tr><td style="padding:16px;text-align:center">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B6A61">Your reference</div>
          <div style="font-size:22px;font-weight:700;letter-spacing:.04em;margin-top:4px">${esc(ref)}</div>
        </td></tr>
      </table>
      <p style="margin:0 0 16px">Please keep it. Quote it in any message to us about your membership.</p>
      <p style="margin:0 0 16px">${feeLine.html}</p>
      <p style="margin:0 0 20px">${
        input.supporter
          ? "You can leave the list at any time. Just message us."
          : "A membership officer reviews your application. We decide within 30 days, and aim for 2 working days."
      }</p>
      <p style="margin:0;padding-top:16px;border-top:1px solid #E2DED2;font-size:13px;color:#6B6A61">HomeBridge Cooperative</p>
    </td></tr>
  </table>
</body></html>`;

  return sendEmail({
    to: input.to,
    subject: input.supporter ? `You're on the HomeBridge Supporter list — ${ref}` : `Your HomeBridge application — ${ref}`,
    text,
    html,
  });
}

export type ResetInput = { to: string; firstName: string; url: string };

/**
 * The password-reset link.
 *
 * It says plainly what to do if the request was not theirs, because an unexpected reset email is
 * the first sign someone else is trying to get into an account.
 */
export async function sendPasswordReset(input: ResetInput): Promise<SendResult> {
  const name = input.firstName.trim() || "there";
  const url = input.url;

  const text = [
    `Hello ${name},`,
    ``,
    `Someone asked to reset the password on your HomeBridge Cooperative account.`,
    ``,
    `Open this link to choose a new password. It works once, and expires in one hour:`,
    url,
    ``,
    `If this was not you, you can ignore this email. Your password has not changed, and nobody can`,
    `use the link unless they can read this inbox.`,
    ``,
    `HomeBridge Cooperative`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1D201C;line-height:1.6">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFDF7;border-radius:12px;border:1px solid #E2DED2">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px">Hello ${esc(name)},</p>
      <p style="margin:0 0 16px">Someone asked to reset the password on your <strong>HomeBridge Cooperative</strong> account.</p>
      <p style="margin:0 0 22px">
        <a href="${esc(url)}" style="display:inline-block;background:#17452F;color:#FFFDF7;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">Choose a new password</a>
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#6B6A61">The link works once and expires in one hour.</p>
      <p style="margin:0 0 20px">If this was not you, you can ignore this email. Your password has not changed, and nobody can use the link unless they can read this inbox.</p>
      <p style="margin:0;padding-top:16px;border-top:1px solid #E2DED2;font-size:13px;color:#6B6A61">HomeBridge Cooperative</p>
    </td></tr>
  </table>
</body></html>`;

  return sendEmail({ to: input.to, subject: "Reset your HomeBridge password", text, html });
}
