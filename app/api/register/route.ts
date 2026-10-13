import { NextResponse } from "next/server";

type Registration = {
  name?: unknown;
  country?: unknown;
  city?: unknown;
  phone?: unknown;
  email?: unknown;
  route?: unknown;
  type?: unknown;
  heard?: unknown;
  consent?: unknown;
};

const ROUTES = ["lives", "land", "other", "none"];

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Receives "Register your interest" submissions.
 * Set REGISTER_WEBHOOK_URL (e.g. a Zapier/Make hook, Google Apps Script, or CRM endpoint)
 * to forward each submission as JSON. Without it, submissions are only written to the server log.
 */
export async function POST(req: Request) {
  let body: Registration;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const entry = {
    name: str(body.name),
    country: str(body.country),
    city: str(body.city),
    phone: str(body.phone, 40),
    email: str(body.email),
    route: ROUTES.includes(str(body.route, 10)) ? str(body.route, 10) : "",
    supporterList: str(body.route, 10) === "none",
    type: str(body.type, 60),
    heard: str(body.heard, 60),
    consent: body.consent === true,
    receivedAt: new Date().toISOString(),
  };

  if (entry.name.length < 2 || !entry.country || !entry.city || entry.phone.replace(/\D/g, "").length < 7 || !entry.route || !entry.consent) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 422 });
  }

  const hook = process.env.REGISTER_WEBHOOK_URL;
  if (hook) {
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => null);
    if (!res || !res.ok) {
      return NextResponse.json({ ok: false, error: "Could not store registration" }, { status: 502 });
    }
  } else {
    console.info("[register-interest]", JSON.stringify(entry));
  }

  return NextResponse.json({ ok: true });
}
