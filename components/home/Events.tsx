"use client";

import { useEffect, useMemo, useState } from "react";
import { CONTACT, DOCS, LAUNCH, NEWS, OTHER_EVENTS, SHARE_MESSAGE } from "@/lib/content";
import { FileIcon, LockIcon, WhatsAppIcon } from "@/components/ui/Icons";
import Link from "next/link";

const waShare = "https://wa.me/?text=" + encodeURIComponent(SHARE_MESSAGE);

function useNow(intervalMs: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** UK is on BST (UTC+1) on 3 October, so subtract one hour to get UTC. */
function launchStartUtc(): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(LAUNCH.timeUK.trim());
  if (!m) return null;
  return Date.UTC(LAUNCH.year, LAUNCH.monthIndex, LAUNCH.day, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
}

function useLaunch() {
  const now = useNow(30_000);
  const start = launchStartUtc();
  // Without a confirmed time, treat the launch as over once the day has ended everywhere.
  const endOfDay = Date.UTC(LAUNCH.year, LAUNCH.monthIndex, LAUNCH.day, 23, 59) + 12 * 3600_000;
  const isPast = now !== null && now > (start ? start + 3 * 3600_000 : endOfDay);

  const times = useMemo(() => {
    if (!start) {
      return {
        headline: "Times show in your own time zone once confirmed",
        rows: [
          { zone: "Nigeria (WAT)", time: "Time to confirm" },
          { zone: "United Kingdom", time: "Time to confirm" },
          { zone: "United States", time: "Time to confirm" },
        ],
      };
    }
    const d = new Date(start);
    const f = (tz?: string) => {
      try {
        return d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", weekday: "short" });
      } catch {
        return "";
      }
    };
    return {
      headline: "Your time: " + f(undefined),
      rows: [
        { zone: "Nigeria (WAT)", time: f("Africa/Lagos") },
        { zone: "United Kingdom", time: f("Europe/London") },
        { zone: "New York", time: f("America/New_York") },
        { zone: "Dubai", time: f("Asia/Dubai") },
      ],
    };
  }, [start]);

  const countdown = useMemo(() => {
    if (!start || now === null || now >= start) return null;
    const ms = start - now;
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return [
      [d, "days"],
      [h, "hrs"],
      [m, "min"],
    ] as const;
  }, [start, now]);
  return { isPast, times, countdown };
}

/** Launch card plus upcoming events (the /events page). */
export function LaunchAndEvents() {
  const { isPast, times, countdown } = useLaunch();
  return (
        <div>
          
          <div className="flex flex-col gap-3.5 rounded-[20px] bg-forest-800 p-6 text-cream">
            <div className="flex items-center gap-4">
              <div className="w-[70px] shrink-0 rounded-[14px] bg-gold py-2 text-center text-forest-900">
                <div className="text-[13px] font-bold">OCT</div>
                <div className="font-display text-[30px] leading-none font-extrabold">3</div>
                <div className="text-xs">Sat</div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="m-0 text-[21px] font-bold">Online launch presentation</h3>
                  {isPast && <span className="rounded-full bg-forest-900 px-2.5 py-0.5 text-xs font-bold text-gold">Held</span>}
                </div>
                <div className="text-[15px] text-on-dark">Zoom · {LAUNCH.dateLabel}</div>
              </div>
            </div>

            {isPast ? (
              <p className="m-0 rounded-[14px] bg-forest-900 px-4 py-3.5 text-base">
                Thank you to everyone who joined the launch. Missed it? Message us on WhatsApp and we will tell you
                about the next online session and the chapter meetings below.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-[14px] bg-forest-900 px-4 py-3.5 text-base">
                {countdown && (
                  <div className="mb-2 flex gap-2" aria-label="Time until the launch">
                    {countdown.map(([n, l]) => (
                      <div key={l} className="min-w-16 rounded-lg bg-forest-800 px-2 py-1.5 text-center">
                        <div className="font-display text-2xl font-extrabold text-gold">{n}</div>
                        <div className="text-xs text-on-dark">{l}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="font-bold text-gold">{times.headline}</div>
                {times.rows.map((t) => (
                  <div key={t.zone} className="flex justify-between gap-3">
                    <span>{t.zone}</span>
                    <b className={t.time === "Time to confirm" ? "font-semibold text-on-dark italic" : ""}>{t.time}</b>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <a
                href="/register"
                className="inline-flex min-h-12 items-center rounded-full bg-cream px-5 font-bold text-forest-800 no-underline hover:bg-white"
              >
                {isPast ? "Start your registration" : "Register for the Zoom"}
              </a>
              <a
                href={waShare}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-cream px-[18px] font-bold text-cream no-underline hover:bg-cream/10 hover:text-cream"
              >
                <WhatsAppIcon size={18} />
                Share on WhatsApp
              </a>
            </div>
          </div>

          <h3 className="mt-6 mb-3 text-[19px] font-bold text-forest-800">Coming up</h3>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {OTHER_EVENTS.map((e) => (
              <li key={e.title + e.where} className="flex flex-wrap justify-between gap-3 rounded-[14px] border border-line bg-paper px-[18px] py-3.5">
                <span>
                  <b className="text-forest-800">{e.title}</b> · {e.where}
                </span>
                <span className="rounded-full bg-butter px-2.5 py-0.5 text-sm font-semibold text-gold-ink">Date to confirm</span>
              </li>
            ))}
          </ul>
        </div>
  );
}

/** News and the documents list (the /documents page). */
export function NewsAndDocs() {
  return (
        <div>
          
          <div className="flex flex-col gap-2.5">
            {NEWS.map((n) => (
              <article key={n.title} className="rounded-[14px] border border-line bg-paper px-[18px] py-4">
                <div className="text-sm text-muted">{n.meta}</div>
                <h3 className="m-0 mt-1 text-lg font-bold text-forest-800">{n.title}</h3>
              </article>
            ))}
          </div>

          <h3 className="mt-6 mb-3 text-[19px] font-bold text-forest-800">Documents</h3>
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[14px] border border-line bg-paper p-0">
            {DOCS.map((d, i) => {
              const inner = (
                <>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={d.available ? "text-forest-800" : "text-line-strong"}>
                      {d.available ? <FileIcon size={20} /> : <LockIcon size={20} />}
                    </span>
                    <span className={d.available ? "text-ink" : "text-muted"}>{d.name}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold ${
                      d.available ? "bg-forest-100 text-forest-800" : "bg-[#ECE7D6] text-muted"
                    }`}
                  >
                    {d.available ? "Request PDF" : d.status}
                  </span>
                </>
              );
              const rowCls = `flex min-h-12 items-center justify-between gap-3 px-[18px] py-3.5 ${i ? "border-t border-line" : ""}`;
              return (
                <li key={d.name}>
                  {d.available ? (
                    <a
                      href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Document request: " + d.name)}`}
                      className={`${rowCls} no-underline transition hover:bg-cream`}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className={rowCls} aria-disabled="true">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 mb-0 text-sm text-muted">Published documents are emailed on request until the member portal opens.</p>
        </div>
  );
}

/** Compact events strip for the home page. */
export function EventsHome() {
  return (
    <section className="border-b border-line bg-cream">
      <div className="mx-auto grid max-w-[1200px] gap-6 px-[clamp(16px,4vw,28px)] py-14 md:grid-cols-[1fr_1.4fr] md:items-center">
        <div>
          <p className="eyebrow">Events</p>
          <h2 className="mt-3 mb-2 text-[clamp(26px,3.2vw,36px)] text-forest-800">Meet us online and in person</h2>
          <p className="m-0 text-body">The online launch was held on {LAUNCH.dateLabel}. Chapter meetings come next.</p>
          <Link href="/events" className="mt-4 inline-block font-semibold">
            All events
          </Link>
        </div>
        <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-3">
          {OTHER_EVENTS.map((e) => (
            <li key={e.title + e.where} className="flex flex-col gap-1 rounded-[18px] border border-line bg-paper p-4">
              <b className="font-semibold text-forest-800">{e.title}</b>
              <span className="text-[14px] text-body">{e.where}</span>
              <span className="mt-1 self-start rounded-full bg-cream px-2.5 py-0.5 text-[12.5px] font-semibold text-gold-ink">Date to confirm</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
