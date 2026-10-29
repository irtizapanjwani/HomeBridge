import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import {
  BODY_MAX,
  DEFAULT_TEMPLATES,
  SUBJECT_MAX,
  TEMPLATE_INFO,
  TEMPLATE_KEYS,
  getTemplate,
  isTemplateKey,
  renderEmail,
  resetTemplate,
  sampleFor,
  saveTemplate,
  templateProblem,
} from "@/lib/email-templates";

/** Every email template: what it is for, its placeholders, and the wording in use. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const templates = await Promise.all(
    TEMPLATE_KEYS.map(async (key) => {
      const t = await getTemplate(key);
      const info = TEMPLATE_INFO[key];
      return {
        key,
        name: info.name,
        when: info.when,
        placeholders: info.placeholders.map(({ name, description }) => ({ name, description })),
        blocks: info.blocks.map(({ name, description }) => ({ name, description })),
        subject: t.subject,
        body: t.body,
        isDefault: t.isDefault,
        defaultSubject: DEFAULT_TEMPLATES[key].subject,
        defaultBody: DEFAULT_TEMPLATES[key].body,
      };
    }),
  );
  return NextResponse.json({ ok: true, templates });
}

/**
 * action=preview  renders the given wording with sample details (nothing saved)
 * action=save     saves it, after checking it still does its job
 * action=reset    goes back to the default wording
 * Saving and resetting are recorded in the audit log.
 */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const key = body.key;
  if (!isTemplateKey(key)) return NextResponse.json({ ok: false, error: "Unknown template" }, { status: 400 });
  const t = {
    subject: typeof body.subject === "string" ? body.subject.slice(0, SUBJECT_MAX + 1) : "",
    body: typeof body.body === "string" ? body.body.slice(0, BODY_MAX + 1) : "",
  };

  try {
    if (body.action === "reset") {
      await resetTemplate(key, await currentOfficer());
      return NextResponse.json({ ok: true, ...DEFAULT_TEMPLATES[key] });
    }
    const problem = templateProblem(key, t);
    if (body.action === "preview") {
      const { vars, blocks } = sampleFor(key);
      const email = renderEmail(t, vars, blocks);
      return NextResponse.json({ ok: true, subject: email.subject, html: email.html, problem });
    }
    if (body.action === "save") {
      if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 422 });
      await saveTemplate(key, t, await currentOfficer());
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[admin] template change failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not save the template" }, { status: 502 });
  }
}
