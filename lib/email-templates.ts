// Editable email templates (brief p.4: "All email and document templates must be editable by the
// VEKAT Manager without a developer").
//
// Each of the client's emails — A (application received), B (more information needed), C (welcome),
// D (not approved) — has a subject and a body the office can change in Settings. The defaults below
// are the wording the site already sends, taken from the client's Email Set.
//
// The body is plain text, so nobody has to write HTML:
//   * a blank line starts a new paragraph; line breaks inside a paragraph are kept
//   * a paragraph whose lines all start with "- " is a bulleted list; "1. ", "2. " a numbered one
//   * a line starting "## " is a heading
//   * **two stars** around words makes them bold
//   * {{FirstName}}, {{MemberNo}} and so on are filled in for each person
//   * a paragraph that is only {{DETAILS}}, {{BUTTON}} and the like is a ready-made block
//     (the membership details table, a link button) that the office can move or remove.

import "server-only";

import { getSetting, setSetting } from "@/lib/app-settings";

export const TEMPLATE_KEYS = ["A", "B", "C", "D", "E"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const isTemplateKey = (v: unknown): v is TemplateKey => typeof v === "string" && (TEMPLATE_KEYS as readonly string[]).includes(v);

export type Template = { subject: string; body: string };

type Field = { name: string; description: string; sample: string };

export type TemplateInfo = {
  key: TemplateKey;
  name: string;
  when: string;
  placeholders: Field[];
  blocks: Field[];
  /** At least one of these must appear, or the email would not do its job. */
  mustInclude: string[];
};

const MOTTO = "HOMEBRIDGE!!! Connecting People! Building Trust! Creating Wealth!";

export const TEMPLATE_INFO: Record<TemplateKey, TemplateInfo> = {
  A: {
    key: "A",
    name: "A. Application received",
    when: "Sent to an applicant as soon as their application is stored.",
    placeholders: [
      { name: "FirstName", description: "Applicant's first name", sample: "Adaeze" },
      { name: "ApplicationRef", description: "Application reference", sample: "HBA-2610-0042" },
      { name: "Fee", description: "Joining fee shown on the form", sample: "₦10,000" },
      { name: "PaymentReference", description: "Payment reference the applicant gave (may be empty)", sample: "FBN2610290012" },
      {
        name: "FeeNote",
        description: "Sentence about the fee they said they paid (empty if they gave none)",
        sample: "You told us you paid the joining fee of ₦10,000, with the reference FBN2610290012. We will confirm it against our account. There is nothing further for you to do.",
      },
    ],
    blocks: [{ name: "REFERENCE_BOX", description: "The application reference in a highlighted box", sample: "" }],
    mustInclude: ["{{ApplicationRef}}", "{{REFERENCE_BOX}}"],
  },
  B: {
    key: "B",
    name: "B. More information needed",
    when: "Sent when an officer clicks Ask for info.",
    placeholders: [
      { name: "FirstName", description: "Applicant's first name", sample: "Adaeze" },
      { name: "ApplicationRef", description: "Application reference", sample: "HBA-2610-0042" },
      { name: "Needed", description: "What the officer asked for, as they typed it", sample: "A clearer copy of your NIN slip." },
      { name: "ReplyBy", description: "Reply-by date (14 days after the request)", sample: "13 November 2026" },
      { name: "AccountLink", description: "Web address of the applicant's account page", sample: "https://www.homebridgecooperative.org/app" },
    ],
    blocks: [
      { name: "NEEDED_BOX", description: "What the officer asked for, in a highlighted box", sample: "" },
      { name: "BUTTON", description: "A “Respond in your account” button", sample: "" },
    ],
    mustInclude: ["{{Needed}}", "{{NEEDED_BOX}}"],
  },
  C: {
    key: "C",
    name: "C. Welcome — membership confirmed",
    when: "Sent with the welcome pack once a member is approved and their fee confirmed.",
    placeholders: [
      { name: "FirstName", description: "Member's first name", sample: "Adaeze" },
      { name: "FullName", description: "Member's full name", sample: "Adaeze Okafor" },
      { name: "MemberNo", description: "Membership number", sample: "HBC-EDO-26-00014" },
      { name: "Category", description: "Membership category", sample: "Home" },
      { name: "Chapter", description: "Zone or chapter", sample: "Edo" },
      { name: "DateAdmitted", description: "Date approved", sample: "2 November 2026" },
      { name: "ReceiptNo", description: "Joining fee receipt number", sample: "VKT-RCP-26-00031" },
      { name: "Minimum", description: "Minimum monthly contribution for their currency", sample: "₦5,000" },
      { name: "ReturnBy", description: "Date the signed forms are due (14 days after admission)", sample: "16 November 2026" },
      { name: "PortalStep", description: "How to sign in to the member portal", sample: "Sign in to the member portal with the email and password you registered with." },
      { name: "PortalLink", description: "Web address of the member portal", sample: "https://www.homebridgecooperative.org/app" },
      { name: "Manager", description: "The appointed manager's name", sample: "VEKAT Group Ltd" },
    ],
    blocks: [
      { name: "DETAILS", description: "Table of the membership details", sample: "" },
      { name: "BUTTON", description: "An “Open the member portal” button", sample: "" },
    ],
    mustInclude: ["{{MemberNo}}", "{{DETAILS}}"],
  },
  D: {
    key: "D",
    name: "D. Application not approved",
    when: "Sent when an officer clicks Refuse.",
    placeholders: [
      { name: "FirstName", description: "Applicant's first name", sample: "Adaeze" },
      { name: "ApplicationRef", description: "Application reference", sample: "HBA-2610-0042" },
      { name: "Reason", description: "The officer's reason, as they typed it", sample: "We could not confirm a residence route under bye-law 5.2." },
    ],
    blocks: [],
    mustInclude: [],
  },
  E: {
    key: "E",
    name: "E. Forms reminder",
    when: "Sent 7 and 14 days after the welcome pack if the declaration or nominee form is still not signed (when reminders are switched on), or by an officer by hand.",
    placeholders: [
      { name: "FirstName", description: "Member's first name", sample: "Adaeze" },
      { name: "MemberNo", description: "Membership number", sample: "HBC-EDO-26-00014" },
      { name: "MissingForms", description: "The form(s) not yet signed", sample: "Member Declaration Form and Nominee Form" },
      { name: "ReturnBy", description: "Date the forms are due (14 days after admission)", sample: "16 November 2026" },
      { name: "PortalLink", description: "Web address of the member portal", sample: "https://www.homebridgecooperative.org/app" },
    ],
    blocks: [{ name: "BUTTON", description: "A “Sign your forms” button", sample: "" }],
    mustInclude: ["{{MissingForms}}"],
  },
};

export const DEFAULT_TEMPLATES: Record<TemplateKey, Template> = {
  A: {
    subject: "HomeBridge application received ({{ApplicationRef}})",
    body: `Hello {{FirstName}},

Thank you for applying to join **HomeBridge Cooperative**. We have your application.

{{REFERENCE_BOX}}

Please keep it and quote it in any message to us about your application. Your permanent membership number is issued when your application is approved.

{{FeeNote}}

A membership officer reviews your application. We decide within 30 days, and aim for 2 working days.

HomeBridge Cooperative`,
  },
  B: {
    subject: "HomeBridge application {{ApplicationRef}}: information needed",
    body: `Dear {{FirstName}},

Thank you for your application. To complete our checks, we need the following:

{{NEEDED_BOX}}

Please sign in to your HomeBridge account and send it from there, or reply to this email, by **{{ReplyBy}}**, quoting **{{ApplicationRef}}**.

{{BUTTON}}

Please do not send ID documents by WhatsApp.

Kind regards,
HomeBridge Membership Team`,
  },
  C: {
    subject: "Welcome to HomeBridge Cooperative – Your Membership is Confirmed ({{MemberNo}})",
    body: `## Your membership is confirmed

Dear {{FirstName}},

On behalf of the Governing Board, I am delighted to welcome you as a member of HomeBridge Cooperative. Your application has been reviewed and approved, and you are now part of a member-owned cooperative bringing together Nigerians and Africans at home and in the diaspora to build shared wealth and develop our communities.

{{DETAILS}}

Please keep your membership number safe. It is your permanent reference with HomeBridge; quote it on every payment, form and enquiry.

## What your membership means
HomeBridge is owned by its members and run on the principle of one member, one vote. The cooperative is managed day to day by {{Manager}}, our appointed manager, under the oversight of the Governing Board and the Supervisory Committee.

## Your next steps
1. Read the attached Member Handbook.
2. Sign and return the attached Member Declaration and Nominee Forms by **{{ReturnBy}}**.
3. Set up your monthly contribution of at least **{{Minimum}}**, held as shares in your name, using the attached Contribution and Payment Guide.
4. {{PortalStep}}

{{BUTTON}}

Always use **{{MemberNo}}** as your payment reference. HomeBridge will never ask you to pay into a personal account. If anyone does, do not pay, and contact us immediately.

## Upcoming: first AGM and official launch
Our first Annual General Meeting and official launch take place in the first week of December 2026. Formal notice with the date, venue and joining link will follow. As a member, you are entitled to attend, speak and vote.

Welcome to the HomeBridge family. Together, we are building a bridge between home and abroad.

Yours sincerely,
**Dr Victor Evbuomwan**
Chairman and Initiator, HomeBridge Cooperative, on behalf of the Governing Board

HomeBridge Cooperative · Managed by {{Manager}}
4 Eregbowa Street, off Trinity Road, Ugbor Quarters, Benin City, Edo State`,
  },
  D: {
    subject: "Your HomeBridge application ({{ApplicationRef}})",
    body: `Dear {{FirstName}},

Thank you for your interest in HomeBridge Cooperative. After reviewing your application, we are unable to approve your membership at this time. {{Reason}}

As stated when you applied, the joining (registration) fee is non-refundable.

If you have questions about this decision, please reply quoting **{{ApplicationRef}}**.

Kind regards,
HomeBridge Membership Team`,
  },
  E: {
    subject: "Reminder: please return your HomeBridge forms ({{MemberNo}})",
    body: `Dear {{FirstName}},

We have not yet received your signed **{{MissingForms}}**. Please complete and return it by **{{ReturnBy}}** so your membership record is complete.

You can sign online in your HomeBridge account in a few minutes — no printing needed. Copies were also attached to your welcome email.

{{BUTTON}}

Thank you,
HomeBridge Membership Team`,
  },
};

// ---------- Stored templates ----------

const settingKey = (key: TemplateKey) => `email_template_${key}`;

/** The template in use: the office's saved version, or the default. Never throws. */
export async function getTemplate(key: TemplateKey): Promise<Template & { isDefault: boolean }> {
  try {
    const saved = await getSetting<Template | null>(settingKey(key), null);
    if (saved && typeof saved.subject === "string" && typeof saved.body === "string") return { ...saved, isDefault: false };
  } catch {
    // A database problem must never stop an email going: fall back to the default wording.
  }
  return { ...DEFAULT_TEMPLATES[key], isDefault: true };
}

export const SUBJECT_MAX = 200;
export const BODY_MAX = 20_000;

/** What would stop a template being saved, or null if it is fine. */
export function templateProblem(key: TemplateKey, t: Template): string | null {
  if (!t.subject.trim()) return "The subject cannot be empty.";
  if (!t.body.trim()) return "The message cannot be empty.";
  if (t.subject.length > SUBJECT_MAX) return `The subject is longer than ${SUBJECT_MAX} characters.`;
  if (t.body.length > BODY_MAX) return "The message is too long.";
  const need = TEMPLATE_INFO[key].mustInclude;
  if (need.length && !need.some((n) => t.subject.includes(n) || t.body.includes(n))) {
    return `The email must include ${need.join(" or ")}, or it would not do its job.`;
  }
  const known = new Set([...TEMPLATE_INFO[key].placeholders.map((p) => p.name), ...TEMPLATE_INFO[key].blocks.map((b) => b.name)]);
  const unknown = [...`${t.subject}\n${t.body}`.matchAll(/\{\{\s*([A-Za-z_]+)\s*\}\}/g)].map((m) => m[1]).filter((n) => !known.has(n));
  if (unknown.length) return `Unknown placeholder: {{${unknown[0]}}}. Use one from the list.`;
  return null;
}

export async function saveTemplate(key: TemplateKey, t: Template, actor: string) {
  await setSetting(settingKey(key), { subject: t.subject.trim(), body: t.body.replace(/\r\n/g, "\n").trim() }, actor, `Email template ${TEMPLATE_INFO[key].name} updated`);
}

export async function resetTemplate(key: TemplateKey, actor: string) {
  await setSetting(settingKey(key), null, actor, `Email template ${TEMPLATE_INFO[key].name} reset to the default wording`);
}

// ---------- Rendering ----------

export type Block = { html: string; text: string };

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escapes the office's text, then applies **bold** and fills placeholders with escaped values. */
function inlineHtml(text: string, vars: Record<string, string>): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (_, n: string) => esc(vars[n] ?? ""));
}

function inlineText(text: string, vars: Record<string, string>): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (_, n: string) => vars[n] ?? "");
}

const P = "margin:0 0 16px;font-size:15px;line-height:1.6";

function renderBlock(lines: string[], vars: Record<string, string>, html: string[], text: string[]) {
  if (!lines.length) return;
  if (lines[0].startsWith("## ")) {
    const title = lines[0].slice(3).trim();
    html.push(`<h2 style="margin:4px 0 8px;font-size:17px;color:#17452F">${inlineHtml(title, vars)}</h2>`);
    text.push(inlineText(title, vars).toUpperCase());
    renderBlock(lines.slice(1), vars, html, text);
    return;
  }
  if (lines.every((l) => /^-\s+/.test(l))) {
    const items = lines.map((l) => l.replace(/^-\s+/, ""));
    html.push(`<ul style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.7">${items.map((i) => `<li>${inlineHtml(i, vars)}</li>`).join("")}</ul>`);
    text.push(items.map((i) => `- ${inlineText(i, vars)}`).join("\n"));
    return;
  }
  if (lines.every((l) => /^\d+\.\s+/.test(l))) {
    const items = lines.map((l) => l.replace(/^\d+\.\s+/, ""));
    html.push(`<ol style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.7">${items.map((i) => `<li>${inlineHtml(i, vars)}</li>`).join("")}</ol>`);
    text.push(items.map((i, n) => `${n + 1}. ${inlineText(i, vars)}`).join("\n"));
    return;
  }
  const plain = lines.map((l) => inlineText(l, vars));
  if (!plain.join("").trim()) return; // a paragraph that was only an empty placeholder
  html.push(`<p style="${P}">${lines.map((l) => inlineHtml(l, vars)).join("<br>")}</p>`);
  text.push(plain.join("\n"));
}

/** Turns a template into the subject, plain-text and HTML versions of one email. */
export function renderEmail(t: Template, vars: Record<string, string>, blocks: Record<string, Block | undefined> = {}) {
  const html: string[] = [];
  const text: string[] = [];
  for (const para of t.body.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const lines = para.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    const only = lines.length === 1 ? lines[0].trim().match(/^\{\{\s*([A-Z_]+)\s*\}\}$/) : null;
    if (only) {
      const b = blocks[only[1]];
      if (b) {
        html.push(b.html);
        text.push(b.text);
      }
      continue;
    }
    renderBlock(lines, vars, html, text);
  }

  return {
    subject: inlineText(t.subject, vars).replace(/\s+/g, " ").trim(),
    text: [MOTTO, "", ...text.flatMap((t) => [t, ""])].join("\n").trim(),
    html: `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1A1D1A">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;background:#FFFDF7;border-radius:14px;border:1px solid #E2DED2">
    <tr><td style="padding:28px">
      <p style="margin:0 0 18px;font-size:12px;font-weight:700;letter-spacing:.06em;color:#C9A227">${esc(MOTTO)}</p>
      ${html.join("\n      ")}
    </td></tr>
  </table>
</body></html>`,
  };
}

/** Renders the template the office has saved (or the default) for one email. */
export async function renderTemplate(key: TemplateKey, vars: Record<string, string>, blocks: Record<string, Block | undefined> = {}) {
  return renderEmail(await getTemplate(key), vars, blocks);
}

// ---------- Ready-made blocks ----------

export function highlightBox(label: string, value: string): Block {
  return {
    html: `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F3F1EA;border-radius:8px"><tr><td style="padding:16px;text-align:center"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B6A61">${esc(label)}</div><div style="font-size:22px;font-weight:700;letter-spacing:.04em;margin-top:4px">${esc(value)}</div></td></tr></table>`,
    text: `${label}: ${value}`,
  };
}

export function quoteBox(value: string): Block {
  return {
    html: `<p style="margin:0 0 16px;padding:12px 14px;background:#F3F1EA;border-radius:8px;font-size:15px;line-height:1.6">${esc(value)}</p>`,
    text: value,
  };
}

export function buttonBlock(label: string, url: string): Block {
  return {
    html: `<p style="margin:0 0 18px"><a href="${esc(url)}" style="display:inline-block;background:#17452F;color:#FFFDF7;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">${esc(label)}</a></p>`,
    text: `${label}: ${url}`,
  };
}

export function detailsTable(rows: [string, string][]): Block {
  return {
    html: `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #ECE6D3;color:#5E6862">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #ECE6D3;font-weight:600;text-align:right">${esc(v)}</td></tr>`,
      )
      .join("")}</table>`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
  };
}

/** The sample values and blocks used by the preview in Settings. */
export function sampleFor(key: TemplateKey): { vars: Record<string, string>; blocks: Record<string, Block> } {
  const vars = Object.fromEntries(TEMPLATE_INFO[key].placeholders.map((p) => [p.name, p.sample]));
  const blocks: Record<string, Block> = {
    REFERENCE_BOX: highlightBox("Your application reference", vars.ApplicationRef ?? ""),
    NEEDED_BOX: quoteBox(vars.Needed ?? ""),
    BUTTON: buttonBlock(
      key === "B" ? "Respond in your account" : key === "E" ? "Sign your forms" : "Open the member portal",
      vars.AccountLink ?? vars.PortalLink ?? "#",
    ),
    DETAILS: detailsTable([
      ["Member name", vars.FullName ?? ""],
      ["Membership number", vars.MemberNo ?? ""],
      ["Membership category", `${vars.Category ?? ""} member`],
      ["Zone / Chapter", vars.Chapter ?? ""],
      ["Date admitted", vars.DateAdmitted ?? ""],
      ["Joining fee receipt", vars.ReceiptNo ?? ""],
    ]),
  };
  return { vars, blocks };
}
