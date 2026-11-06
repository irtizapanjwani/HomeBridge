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

import { buttonBlock, highlightBox, quoteBox, renderTemplate } from "@/lib/email-templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Resend's shared test sender. Deliverable only to the Resend account's own address. */
const TEST_FROM = "onboarding@resend.dev";

const apiKey = process.env.RESEND_API_KEY;

export const isEmailConfigured = () => Boolean(apiKey);

/**
 * How email is set up right now, for the admin screens. In test mode (no EMAIL_FROM) Resend only
 * delivers to the address that owns the Resend account, so mail to anyone else is refused.
 */
export function emailSetup() {
  const from = process.env.EMAIL_FROM?.trim() || "";
  return { configured: Boolean(apiKey), testMode: !from, from: from || TEST_FROM };
}

/** Resend's error message, in words an officer can act on. */
export function explainEmailError(raw: string) {
  const m = raw.toLowerCase();
  if (m.includes("resend_api_key")) return "Email is not switched on: RESEND_API_KEY is missing from the settings.";
  if (m.includes("testing emails") || m.includes("own email address"))
    return "Email is still in test mode, so Resend only delivers to the Resend account owner's address. Set EMAIL_FROM to an address on the verified domain to send to members.";
  if (m.includes("not verified"))
    return "The sending address in EMAIL_FROM is on a domain Resend has not verified yet. Verify the domain in Resend, or fix EMAIL_FROM.";
  if (m.includes("api key is invalid") || m.includes("invalid api key")) return "RESEND_API_KEY is wrong or has been revoked.";
  if (m.includes("rate limit") || m.includes("too many")) return "Resend's sending limit was hit. Wait a minute and try again.";
  return `Resend refused it: ${raw}`;
}

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
  /** Extra headers, e.g. In-Reply-To and References to keep an office alert in one conversation. */
  headers?: Record<string, string>;
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
        ...(input.headers && Object.keys(input.headers).length ? { headers: input.headers } : {}),
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

export type FeeReceiptEmail = {
  to: string;
  firstName: string;
  reference: string;
  receiptNo: string;
  /** The amount as it should read, e.g. "£10.00". */
  amount: string;
  receipt: Attachment;
};

/**
 * The email an applicant gets when their joining fee is confirmed, with the VEKAT receipt
 * attached.
 *
 * The client's workflow issues the receipt at the "fee paid" step, before vetting starts, rather
 * than holding it back until admission — so this goes out well before the welcome pack, which
 * carries a copy of the same receipt.
 */
export async function sendFeeReceipt(input: FeeReceiptEmail): Promise<SendResult> {
  const name = input.firstName.trim() || "there";

  const text = [
    `Hello ${name},`,
    ``,
    `We have received your joining fee of ${input.amount}. Your receipt is attached.`,
    ``,
    `Receipt number: ${input.receiptNo}`,
    `Application reference: ${input.reference}`,
    ``,
    `This is the one-off joining fee, paid to VEKAT, the cooperative's appointed manager. It is separate from your monthly share contributions, which are paid to HomeBridge Cooperative's own accounts once you are a member.`,
    ``,
    `A membership officer is reviewing your application. We will email you again with the outcome. There is nothing further for you to do.`,
    ``,
    `HomeBridge Cooperative`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1D201C;line-height:1.6">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFDF7;border-radius:12px;border:1px solid #E2DED2">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px">Hello ${esc(name)},</p>
      <p style="margin:0 0 16px">We have received your joining fee of <strong>${esc(input.amount)}</strong>. Your receipt is attached.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F3F1EA;border-radius:8px">
        <tr><td style="padding:16px;text-align:center">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B6A61">Receipt number</div>
          <div style="font-size:22px;font-weight:700;letter-spacing:.04em;margin-top:4px">${esc(input.receiptNo)}</div>
          <div style="font-size:13px;color:#6B6A61;margin-top:8px">Application ${esc(input.reference)}</div>
        </td></tr>
      </table>
      <p style="margin:0 0 16px">This is the one-off joining fee, paid to VEKAT, the cooperative&rsquo;s appointed manager. It is separate from your monthly share contributions, which are paid to HomeBridge Cooperative&rsquo;s own accounts once you are a member.</p>
      <p style="margin:0 0 20px">A membership officer is reviewing your application. We will email you again with the outcome. There is nothing further for you to do.</p>
      <p style="margin:0;padding-top:16px;border-top:1px solid #E2DED2;font-size:13px;color:#6B6A61">HomeBridge Cooperative</p>
    </td></tr>
  </table>
</body></html>`;

  return sendEmail({
    to: input.to,
    subject: `Your HomeBridge joining fee receipt — ${input.receiptNo}`,
    text,
    html,
    attachments: [input.receipt],
  });
}

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

  // Applicants get Email A, whose wording the office can edit in Settings. The Supporter-list
  // confirmation below is not one of the client's emails and keeps its fixed wording.
  if (!input.supporter) {
    const feeNote = input.fee || payRef
      ? `You told us you paid the joining fee${input.fee ? ` of ${input.fee}` : ""}${payRef ? `, with the reference ${payRef}` : ""}. We will confirm it against our account. There is nothing further for you to do.`
      : "";
    const email = await renderTemplate(
      "A",
      { FirstName: name, ApplicationRef: ref, Fee: input.fee ?? "", PaymentReference: payRef, FeeNote: feeNote },
      { REFERENCE_BOX: highlightBox("Your application reference", ref) },
    );
    return sendEmail({ to: input.to, ...email });
  }
  // Email A in the client's Email Set: the applicant gets an application reference here. Their
  // permanent membership number comes later, in the welcome email, once VEKAT approves them.
  const refLabel = input.supporter ? "Your reference" : "Your application reference";
  const keepIt = input.supporter
    ? "Please keep it. Quote it in any message to us."
    : "Please keep it and quote it in any message to us about your application. Your permanent membership number is issued when your application is approved.";

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
    `${refLabel}: ${ref}`,
    keepIt,
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
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B6A61">${esc(refLabel)}</div>
          <div style="font-size:22px;font-weight:700;letter-spacing:.04em;margin-top:4px">${esc(ref)}</div>
        </td></tr>
      </table>
      <p style="margin:0 0 16px">${esc(keepIt)}</p>
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
    subject: input.supporter
      ? `You're on the HomeBridge Supporter list — ${ref}`
      : `HomeBridge application received (${ref})`,
    text,
    html,
  });
}

const LAGOS_LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** How long an applicant is given to send what was asked for. */
export const INFO_REQUEST_DAYS = 14;

export type InfoRequestEmail = {
  to: string;
  firstName: string;
  reference: string;
  /** What the officer needs, exactly as they typed it in the vetting screen. */
  needed: string;
  /** When the request was made; the reply-by date is counted from here. */
  at: Date;
  /** The applicant's account page, where they can answer and upload. */
  accountUrl?: string;
};

/**
 * Email B in the client's Email Set: "More information needed", sent when an officer asks the
 * applicant for something during vetting.
 *
 * The template offers "reply to this email or upload it through [link]": the link is the
 * applicant's account, where a box shows what was asked and takes a message and a file. Uploading
 * there is the safer route for an ID copy, so it is offered first.
 */
export async function sendInfoRequest(input: InfoRequestEmail): Promise<SendResult> {
  const by = LAGOS_LONG_DATE.format(new Date(input.at.getTime() + INFO_REQUEST_DAYS * 86_400_000));
  const email = await renderTemplate(
    "B",
    {
      FirstName: input.firstName.trim() || "there",
      ApplicationRef: input.reference,
      Needed: input.needed,
      ReplyBy: by,
      AccountLink: input.accountUrl ?? "",
    },
    {
      NEEDED_BOX: quoteBox(input.needed),
      BUTTON: input.accountUrl ? buttonBlock("Respond in your account", input.accountUrl) : undefined,
    },
  );
  return sendEmail({ to: input.to, ...email });
}

export type DeclineEmail = {
  to: string;
  firstName: string;
  reference: string;
  /** The officer's reason. The vetting screen tells the officer this is sent to the applicant. */
  reason: string;
};

/** Email D in the client's Email Set: "Application not approved", sent when an officer declines. */
export async function sendDecline(input: DeclineEmail): Promise<SendResult> {
  const email = await renderTemplate("D", {
    FirstName: input.firstName.trim() || "there",
    ApplicationRef: input.reference,
    Reason: input.reason,
  });
  return sendEmail({ to: input.to, ...email });
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

export type LoginCodeInput = { to: string; firstName: string; code: string; minutes: number };

/** A one-time sign-in code for the member portal. */
export async function sendLoginCode(input: LoginCodeInput): Promise<SendResult> {
  const name = input.firstName.trim() || "there";
  const text = [
    `Hello ${name},`,
    ``,
    `Your HomeBridge sign-in code is: ${input.code}`,
    ``,
    `Enter it on the sign-in page within ${input.minutes} minutes. It works once.`,
    ``,
    `If you did not ask to sign in, you can ignore this email. Nobody can use the code unless they can read this inbox.`,
    ``,
    `HomeBridge Cooperative`,
  ].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1D201C;line-height:1.6">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFDF7;border-radius:12px;border:1px solid #E2DED2">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px">Hello ${esc(name)},</p>
      <p style="margin:0 0 12px">Your <strong>HomeBridge</strong> sign-in code is:</p>
      <p style="margin:0 0 16px;padding:14px;background:#F3F1EA;border-radius:8px;text-align:center;font-size:30px;font-weight:700;letter-spacing:.3em">${esc(input.code)}</p>
      <p style="margin:0 0 16px">Enter it on the sign-in page within ${input.minutes} minutes. It works once.</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6B6A61">If you did not ask to sign in, you can ignore this email. Nobody can use the code unless they can read this inbox.</p>
      <p style="margin:0;padding-top:16px;border-top:1px solid #E2DED2;font-size:13px;color:#6B6A61">HomeBridge Cooperative</p>
    </td></tr>
  </table>
</body></html>`;
  return sendEmail({ to: input.to, subject: `Your HomeBridge sign-in code: ${input.code}`, text, html });
}

export type ContributionReceiptEmail = {
  to: string;
  firstName: string;
  receiptNo: string;
  amount: string;
  period: string;
  memberNo: string;
  receipt: Attachment;
};

/** Sent when a contribution is recorded, with the HBC-CR receipt attached. */
export async function sendContributionReceipt(input: ContributionReceiptEmail): Promise<SendResult> {
  const name = input.firstName.trim() || "there";
  const text = [
    `Hello ${name},`,
    ``,
    `Thank you. We have received your contribution of ${input.amount} for ${input.period}. Your receipt is attached.`,
    ``,
    `Receipt number: ${input.receiptNo}`,
    `Membership number: ${input.memberNo}`,
    ``,
    `It is held as shares in your name. You can see all your contributions in your HomeBridge account.`,
    ``,
    `HomeBridge Cooperative`,
  ].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1D201C;line-height:1.6">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFDF7;border-radius:12px;border:1px solid #E2DED2">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px">Hello ${esc(name)},</p>
      <p style="margin:0 0 16px">Thank you. We have received your contribution of <strong>${esc(input.amount)}</strong> for <strong>${esc(input.period)}</strong>. Your receipt is attached.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F3F1EA;border-radius:8px">
        <tr><td style="padding:16px;text-align:center">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B6A61">Receipt number</div>
          <div style="font-size:22px;font-weight:700;letter-spacing:.04em;margin-top:4px">${esc(input.receiptNo)}</div>
          <div style="font-size:13px;color:#6B6A61;margin-top:8px">Member ${esc(input.memberNo)}</div>
        </td></tr>
      </table>
      <p style="margin:0 0 20px">It is held as shares in your name. You can see all your contributions in your HomeBridge account.</p>
      <p style="margin:0;padding-top:16px;border-top:1px solid #E2DED2;font-size:13px;color:#6B6A61">HomeBridge Cooperative</p>
    </td></tr>
  </table>
</body></html>`;
  return sendEmail({ to: input.to, subject: `Your HomeBridge contribution receipt — ${input.receiptNo}`, text, html, attachments: [input.receipt] });
}

/**
 * Sends many emails at once through Resend's batch endpoint (up to 100 per call, no attachments).
 * Used for notices to members. Returns how many were accepted and how many were not.
 */
export async function sendEmailBatch(items: { to: string; subject: string; text: string; html: string }[]): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (!apiKey) return { sent: 0, failed: items.length, errors: ["RESEND_API_KEY is not set"] };
  const from = process.env.EMAIL_FROM?.trim() || TEST_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || "";
  const out = { sent: 0, failed: 0, errors: [] as string[] };
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    if (i > 0) await new Promise((r) => setTimeout(r, 600)); // stay under Resend's requests-per-second limit
    try {
      const res = await fetch(`${RESEND_ENDPOINT}/batch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((e) => ({ from, to: [e.to], subject: e.subject, text: e.text, html: e.html, ...(replyTo ? { reply_to: [replyTo] } : {}) })),
        ),
      });
      const data = (await res.json().catch(() => null)) as { data?: unknown[]; message?: string } | null;
      if (!res.ok) {
        out.failed += chunk.length;
        out.errors.push(data?.message || `Resend returned ${res.status}`);
      } else {
        const accepted = Array.isArray(data?.data) ? data!.data!.length : chunk.length;
        out.sent += accepted;
        out.failed += chunk.length - accepted;
      }
    } catch (err) {
      out.failed += chunk.length;
      out.errors.push(err instanceof Error ? err.message : "unknown error");
    }
  }
  return out;
}

/** Where new-application alerts go. OFFICE_ALERT_EMAIL can list several, comma-separated. */
const DEFAULT_OFFICE_ALERT = "info@homebridgecooperative.org";

export type OfficeAlertInput = {
  reference: string;
  fullName: string;
  /** "Applicant" or "Supporter". */
  kind: string;
  email?: string;
  phone?: string;
  memberType?: string;
  country?: string;
  chapter?: string;
  paymentMethod?: string;
  /** The admin panel, so the officer can open the application straight away. */
  adminUrl?: string;
};

/**
 * Tells the HomeBridge office that someone has just applied or created an account, so they do not
 * have to keep checking the admin panel. It carries contact details only: no ID number, no date of
 * birth and no documents, which stay in the admin panel behind the officer login.
 */
/** The office addresses for alerts and daily lists, or [] when OFFICE_ALERT_EMAIL is "off". */
export function officeRecipients(): string[] {
  const raw = process.env.OFFICE_ALERT_EMAIL?.trim();
  if (raw === "off") return [];
  return (raw || DEFAULT_OFFICE_ALERT).split(",").map((s) => s.trim()).filter(Boolean);
}

/** The new-application alert's subject. Replies about the same application reuse it, so they thread. */
export const officeAlertSubject = (kind: string, fullName: string, reference: string) => `New HomeBridge ${kind.toLowerCase()}: ${fullName} (${reference})`;

/**
 * Resend's id for each copy of the new-application alert, by recipient, so later emails about the
 * same application can be sent as replies to it and show up in the same conversation.
 */
export type AlertThread = { subject: string; ids: Record<string, string> };

/** The Message-ID Resend gave a sent email, needed for In-Reply-To. Null if it cannot be read. */
async function messageIdOf(emailId: string): Promise<string | null> {
  if (!apiKey || !emailId) return null;
  try {
    const res = await fetch(`${RESEND_ENDPOINT}/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return null;
    const d = (await res.json().catch(() => null)) as { message_id?: string } | null;
    const id = d?.message_id?.trim();
    return id ? (id.startsWith("<") ? id : `<${id}>`) : null;
  } catch {
    return null;
  }
}

export async function sendOfficeAlert(input: OfficeAlertInput): Promise<SendResult & { thread?: AlertThread }> {
  const recipients = officeRecipients();
  if (!recipients.length) return { ok: true, id: "" };

  const rows: [string, string][] = (
    [
      ["Reference", input.reference],
      ["Name", input.fullName],
      ["Type", input.kind],
      ["Email", input.email || ""],
      ["Phone", input.phone || ""],
      ["Membership", input.memberType || ""],
      ["Country", input.country || ""],
      ["Chapter", input.chapter || ""],
      ["Payment", input.paymentMethod || ""],
    ] as [string, string][]
  ).filter(([, v]) => v.trim());

  const subject = officeAlertSubject(input.kind, input.fullName, input.reference);
  const text = [
    `A new ${input.kind.toLowerCase()} has just come in on the HomeBridge site.`,
    ``,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ``,
    input.adminUrl ? `Open it in the admin panel: ${input.adminUrl}` : `Open the admin panel to review it.`,
    ``,
    `ID documents are not included in this email. View them in the admin panel.`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1D201C;line-height:1.6">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFDF7;border-radius:12px;border:1px solid #E2DED2">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px">A new <strong>${esc(input.kind.toLowerCase())}</strong> has just come in on the HomeBridge site.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;background:#F3F1EA;border-radius:8px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:8px 16px;color:#6B6A61;font-size:13px;width:120px">${esc(k)}</td><td style="padding:8px 16px;font-weight:600">${esc(v)}</td></tr>`,
          )
          .join("")}
      </table>
      ${
        input.adminUrl
          ? `<p style="margin:0 0 20px"><a href="${esc(input.adminUrl)}" style="display:inline-block;background:#1F4D3A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open the admin panel</a></p>`
          : ""
      }
      <p style="margin:0;padding-top:16px;border-top:1px solid #E2DED2;font-size:13px;color:#6B6A61">ID documents are not included in this email. View them in the admin panel.</p>
    </td></tr>
  </table>
</body></html>`;

  let last: SendResult = { ok: true, id: "" };
  const ids: Record<string, string> = {};
  for (const to of recipients) {
    const sent = await sendEmail({ to, subject, text, html });
    if (!sent.ok) last = sent;
    else if (sent.id) ids[to] = sent.id;
  }
  return { ...last, thread: { subject, ids } };
}

export type InfoReplyAlertInput = {
  reference: string;
  fullName: string;
  email?: string;
  /** What the officer asked for, if it was recorded. */
  asked?: string;
  /** The applicant's answer. */
  message: string;
  /** Whether they attached a file (the file itself never goes by email). */
  withFile: boolean;
  adminUrl?: string;
  /** The new-application alert this belongs under, so it lands in the same conversation. */
  thread?: AlertThread;
  /** Used to rebuild the original subject for older applications sent before threads were saved. */
  kind?: string;
};

/**
 * Tells the office that an applicant has answered "more information needed" from their account, so
 * nobody has to keep checking the admin panel. Goes to the same addresses as new-application alerts.
 */
export async function sendInfoReplyAlert(input: InfoReplyAlertInput): Promise<SendResult> {
  const recipients = officeRecipients();
  if (!recipients.length) return { ok: true, id: "" };

  // A reply in the conversation that started with the new-application alert, rather than a new
  // email: same subject with "Re:", and In-Reply-To pointing at the original.
  const subject = `Re: ${input.thread?.subject || officeAlertSubject(input.kind || "Application", input.fullName, input.reference)}`;
  const text = [
    `${input.fullName} has replied to your request for more information on their HomeBridge application.`,
    ``,
    `Application: ${input.reference}`,
    input.email ? `Email: ${input.email}` : "",
    input.asked ? `You asked: ${input.asked}` : "",
    ``,
    `Their reply:`,
    input.message || "(no message)",
    input.withFile ? `\nThey also attached a file. Open it in the admin panel.` : "",
    ``,
    `The application is back "In review" and waiting for you.`,
    input.adminUrl ? `Open it: ${input.adminUrl}` : `Open the admin panel to review it.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1D201C;line-height:1.6">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFDF7;border-radius:12px;border:1px solid #E2DED2">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px;font-size:17px"><strong>Update: ${esc(input.fullName)} has sent the information you asked for.</strong></p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F3F1EA;border-radius:8px">
        <tr><td style="padding:8px 16px;color:#6B6A61;font-size:13px;width:120px">Application</td><td style="padding:8px 16px;font-weight:600">${esc(input.reference)}</td></tr>
        ${input.email ? `<tr><td style="padding:8px 16px;color:#6B6A61;font-size:13px">Email</td><td style="padding:8px 16px;font-weight:600">${esc(input.email)}</td></tr>` : ""}
        ${input.asked ? `<tr><td style="padding:8px 16px;color:#6B6A61;font-size:13px">You asked</td><td style="padding:8px 16px">${esc(input.asked)}</td></tr>` : ""}
      </table>
      <p style="margin:0 0 6px;font-size:13px;color:#6B6A61">Their reply</p>
      <div style="margin:0 0 16px;padding:14px 16px;border-left:4px solid #1F4D3A;background:#F3F1EA;border-radius:4px;white-space:pre-wrap">${esc(input.message || "(no message)")}</div>
      ${input.withFile ? `<p style="margin:0 0 16px"><strong>They also attached a file.</strong> Open it in the admin panel.</p>` : ""}
      <p style="margin:0 0 20px">The application is back <strong>In review</strong> and waiting for you.</p>
      ${
        input.adminUrl
          ? `<p style="margin:0"><a href="${esc(input.adminUrl)}" style="display:inline-block;background:#1F4D3A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open the application</a></p>`
          : ""
      }
    </td></tr>
  </table>
</body></html>`;

  let last: SendResult = { ok: true, id: "" };
  for (const to of recipients) {
    const original = input.thread?.ids[to] ? await messageIdOf(input.thread.ids[to]) : null;
    const headers = original ? { "In-Reply-To": original, References: original } : undefined;
    const sent = await sendEmail({ to, subject, text, html, headers });
    if (!sent.ok) last = sent;
  }
  return last;
}
