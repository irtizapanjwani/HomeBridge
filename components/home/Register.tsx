"use client";

import { useState } from "react";
import { CONTACT, HEARD_OPTIONS, JOIN_STEPS, MEMBER_TYPE_OPTIONS, SHARE_MESSAGE } from "@/lib/content";
import { CheckIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/ui/Icons";

type Fields = {
  name: string;
  country: string;
  city: string;
  phone: string;
  email: string;
  type: string;
  heard: string;
  consent: boolean;
};

const EMPTY: Fields = {
  name: "",
  country: "",
  city: "",
  phone: "",
  email: "",
  type: MEMBER_TYPE_OPTIONS[0],
  heard: HEARD_OPTIONS[0],
  consent: false,
};

function validate(f: Fields) {
  const e: Partial<Record<keyof Fields, string>> = {};
  if (f.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!f.country.trim()) e.country = "Please enter your country.";
  if (!f.city.trim()) e.city = "Please enter your city.";
  if (f.phone.replace(/\D/g, "").length < 7) e.phone = "Please enter a phone or WhatsApp number we can reach.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "That email doesn’t look right.";
  if (!f.consent) e.consent = "Please tick to confirm you understand.";
  return e;
}

const inputCls =
  "min-h-[50px] w-full rounded-[10px] border bg-white px-3.5 text-[17px] transition focus:border-forest-800 focus:shadow-[0_0_0_3px_rgb(201_162_39/0.35)] focus:outline-none";

export function Register() {
  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setF((cur) => ({ ...cur, [k]: v }));
    if (errors[k]) setErrors((cur) => ({ ...cur, [k]: undefined }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(f);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`r-${first}`)?.focus();
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
    } catch {
      setState("error");
    }
  }

  const field = (key: keyof Fields, label: React.ReactNode, input: React.ReactNode) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={`r-${key}`} className="font-semibold">
        {label}
      </label>
      {input}
      {errors[key] && (
        <span id={`r-${key}-err`} className="text-sm font-semibold text-danger">
          {errors[key]}
        </span>
      )}
    </div>
  );
  const border = (k: keyof Fields) => (errors[k] ? "border-danger" : "border-line-strong");
  const aria = (k: keyof Fields) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `r-${k}-err` : undefined,
  });

  return (
    <section id="register" className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)] py-16">
      <div className="grid items-start gap-9 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="eyebrow">Register your interest</p>
          <h2 className="m-0 font-display text-[clamp(30px,4.2vw,46px)] font-extrabold tracking-[-0.015em] text-forest-800">
            Be first to hear when membership opens
          </h2>
          <p className="m-0 text-muted">
            This is not an application and you pay nothing now. We will contact you when registration is approved and
            full membership opens.
          </p>

          <div className="rounded-[18px] border border-line bg-paper p-5">
            <h3 className="m-0 mb-3 text-lg font-bold text-forest-800">What happens when membership opens</h3>
            <ol className="m-0 flex list-none flex-col gap-0 p-0">
              {JOIN_STEPS.map((s, i) => (
                <li key={s.title} className="relative flex gap-3.5 pb-4 last:pb-0">
                  {i < JOIN_STEPS.length - 1 && (
                    <span aria-hidden="true" className="absolute top-8 bottom-0 left-[15px] w-0.5 bg-line" />
                  )}
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-800 text-sm font-bold text-cream">
                    {i + 1}
                  </span>
                  <span className="text-base">
                    <b className="text-forest-800">{s.title}</b>
                    <br />
                    <span className="text-muted">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div id="contact" className="adire flex flex-col gap-3.5 rounded-[20px] bg-forest-800 p-6 text-cream">
            <h3 className="m-0 font-display text-[22px] font-bold">Contact us</h3>
            <div className="flex items-start gap-3">
              <PinIcon size={22} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <b>Head office</b>
                <br />
                {CONTACT.address[0]}
                <br />
                {CONTACT.address[1]}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MailIcon size={22} className="shrink-0 text-gold" />
              <a href={`mailto:${CONTACT.email}`} className="break-all text-cream hover:text-gold">
                {CONTACT.email}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <PhoneIcon size={22} className="shrink-0 text-gold" />
              <a href={CONTACT.phoneHref} className="text-cream hover:text-gold">
                {CONTACT.phoneDisplay}
              </a>
              <span className="text-sm text-on-dark">({CONTACT.phoneIntl})</span>
            </div>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-gold px-5 font-bold text-forest-900 no-underline hover:bg-gold-soft hover:text-forest-900"
            >
              <WhatsAppIcon size={18} />
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <div className="rounded-[22px] border border-line bg-paper p-6 shadow-card sm:p-7 lg:sticky lg:top-24">
          {state === "sent" ? (
            <div className="flex flex-col items-start gap-3.5" role="status">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-800 text-gold">
                <CheckIcon size={28} />
              </div>
              <h3 className="m-0 font-display text-[26px] font-bold text-forest-800">
                Thank you{f.name ? `, ${f.name.trim().split(/\s+/)[0]}` : ""} — you’re on the list
              </h3>
              <p className="m-0 text-muted">
                We will message you on WhatsApp when membership opens. Tell a friend at home or abroad.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={"https://wa.me/?text=" + encodeURIComponent(SHARE_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest-800 px-5 font-bold text-cream no-underline hover:bg-forest-900 hover:text-cream"
                >
                  <WhatsAppIcon size={18} /> Share on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setF(EMPTY);
                    setState("idle");
                  }}
                  className="min-h-12 rounded-full border-2 border-forest-800 px-5 font-bold text-forest-800 hover:bg-forest-800 hover:text-cream"
                >
                  Register someone else
                </button>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Register your interest">
              <h3 className="m-0 font-display text-[22px] font-bold text-forest-800">Your details</h3>
              {field(
                "name",
                "Full name",
                <input id="r-name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} className={`${inputCls} ${border("name")}`} {...aria("name")} />,
              )}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {field(
                  "country",
                  "Country",
                  <input id="r-country" autoComplete="country-name" value={f.country} onChange={(e) => set("country", e.target.value)} className={`${inputCls} ${border("country")}`} {...aria("country")} />,
                )}
                {field(
                  "city",
                  "City",
                  <input id="r-city" autoComplete="address-level2" value={f.city} onChange={(e) => set("city", e.target.value)} className={`${inputCls} ${border("city")}`} {...aria("city")} />,
                )}
              </div>
              {field(
                "phone",
                "Phone / WhatsApp",
                <input id="r-phone" type="tel" autoComplete="tel" placeholder="+234…" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={`${inputCls} ${border("phone")}`} {...aria("phone")} />,
              )}
              {field(
                "email",
                <>
                  Email <span className="font-normal text-muted">(optional)</span>
                </>,
                <input id="r-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={`${inputCls} ${border("email")}`} {...aria("email")} />,
              )}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {field(
                  "type",
                  "Member type",
                  <select id="r-type" value={f.type} onChange={(e) => set("type", e.target.value)} className={`${inputCls} border-line-strong`}>
                    {MEMBER_TYPE_OPTIONS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>,
                )}
                {field(
                  "heard",
                  "How did you hear?",
                  <select id="r-heard" value={f.heard} onChange={(e) => set("heard", e.target.value)} className={`${inputCls} border-line-strong`}>
                    {HEARD_OPTIONS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>,
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-start gap-3 text-base">
                  <input
                    id="r-consent"
                    type="checkbox"
                    checked={f.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                    className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-forest-800"
                    {...aria("consent")}
                  />
                  <span>
                    I understand there are no guaranteed returns, this is not a savings scheme, and HomeBridge may
                    contact me about membership. I agree to the{" "}
                    <a href="#privacy" className="font-semibold">
                      privacy notice
                    </a>
                    .
                  </span>
                </label>
                {errors.consent && (
                  <span id="r-consent-err" className="text-sm font-semibold text-danger">
                    {errors.consent}
                  </span>
                )}
              </div>
              {state === "error" && (
                <p role="alert" className="m-0 rounded-xl bg-[#F6DED8] px-4 py-3 text-base text-danger">
                  Something went wrong sending your details. Please try again, or message us on{" "}
                  <a href={CONTACT.whatsapp} className="font-bold text-danger">
                    WhatsApp
                  </a>
                  .
                </p>
              )}
              <button
                type="submit"
                disabled={state === "sending"}
                className="min-h-[54px] rounded-full bg-forest-800 text-lg font-bold text-cream transition hover:bg-forest-900 disabled:opacity-60"
              >
                {state === "sending" ? "Sending…" : "Register my interest"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
