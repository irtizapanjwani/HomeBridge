"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Banner, Btn, Card, CardTitle, Pill, inputCls } from "../ui";

type Person = { memberNo: string; name: string; email: string; chapter: string };
type Recent = {
  id: string;
  subject: string;
  audience: string;
  recipients: number;
  sent: number;
  failed: number;
  by: string;
  at: string;
  message: string;
  to: { memberNo: string; name: string; email: string }[];
  error: string;
};
type EmailSetup = { configured: boolean; testMode: boolean; from: string };
type Kind = "all" | "zone" | "behind" | "pick";

const KINDS: [Kind, string, string][] = [
  ["all", "Everyone", "All members"],
  ["zone", "One chapter", "Members of one chapter"],
  ["behind", "Behind on payment", "Members who haven't paid this month"],
  ["pick", "Choose people", "Tick the members you want"],
];

/**
 * Member Platform brief §6 "Broadcast". Three steps an officer can follow without guessing: choose
 * who gets it (and see their names and emails), write it, then check the preview and send.
 */
export function NoticesCard() {
  const toast = useToast();
  const [zones, setZones] = useState<string[]>([]);
  const [everyone, setEveryone] = useState<Person[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [kind, setKind] = useState<Kind>("all");
  const [zone, setZone] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [find, setFind] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [withoutEmail, setWithoutEmail] = useState(0);
  const [preview, setPreview] = useState<{ subject: string; html: string; as: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mail, setMail] = useState<EmailSetup | null>(null);
  const [outcome, setOutcome] = useState<{ sent: number; of: number; error: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/notices")
      .then((r) => r.json())
      .then((d: { ok?: boolean; zones?: string[]; recent?: Recent[]; members?: Person[]; email?: EmailSetup; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load notices.");
        setZones(d.zones ?? []);
        setRecent(d.recent ?? []);
        setEveryone(d.members ?? []);
        setMail(d.email ?? null);
        setZone((z) => z || d.zones?.[0] || "");
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  const audience = useMemo(
    () => (kind === "zone" ? { kind, zone } : kind === "pick" ? { kind, memberNos: [...picked] } : { kind }),
    [kind, zone, picked],
  );

  // Who gets it, by name and email, refreshed whenever the choice changes.
  useEffect(() => {
    setPreview(null);
    if (kind === "pick") {
      setPeople(everyone.filter((p) => picked.has(p.memberNo)));
      setWithoutEmail(0);
      return;
    }
    if (kind === "zone" && !zone) return setPeople(null);
    let live = true;
    fetch("/api/admin/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, preview: true }) })
      .then((r) => r.json())
      .then((d: { ok?: boolean; people?: Person[]; withoutEmail?: number }) => {
        if (!live || !d.ok) return;
        setPeople(d.people ?? []);
        setWithoutEmail(d.withoutEmail ?? 0);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [audience, kind, zone, picked, everyone]);

  const count = people?.length ?? 0;
  const ready = count > 0 && subject.trim() !== "" && message.trim().length >= 5;

  async function showPreview() {
    setErr("");
    try {
      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: kind === "pick" && !picked.size ? { kind: "all" } : audience, preview: "email", subject, message }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; subject?: string; html?: string; as?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "Could not show the preview.");
      setPreview({ subject: d.subject ?? "", html: d.html ?? "", as: d.as ?? "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not show the preview.");
    }
  }

  async function send() {
    if (!ready) return;
    const names = (people ?? []).slice(0, 5).map((p) => p.name).join(", ");
    if (!window.confirm(`Send “${subject}” by email to ${count} member${count === 1 ? "" : "s"}?\n\n${names}${count > 5 ? ` and ${count - 5} more` : ""}`)) return;
    setBusy(true);
    setErr("");
    setOutcome(null);
    try {
      const res = await fetch("/api/admin/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, subject, message }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; sent?: number; failed?: number; recipients?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || "The notice could not be sent.");
      setOutcome({ sent: d.sent ?? 0, of: d.recipients ?? 0, error: d.error ?? "" });
      if (!d.failed) toast(`Sent to ${d.sent} member${d.sent === 1 ? "" : "s"}.`);
      setSubject("");
      setMessage("");
      setPreview(null);
      setPicked(new Set());
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The notice could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const needle = find.trim().toLowerCase();
  const pickList = everyone.filter((p) => !needle || [p.name, p.email, p.memberNo, p.chapter].some((v) => v.toLowerCase().includes(needle)));

  return (
    <Card className="flex flex-col gap-5 p-5">
      <CardTitle id="notices" aside={<Pill tone="green">Live</Pill>}>
        Send a notice to members
      </CardTitle>
      <p className="m-0 text-[14.5px] text-body">Email an announcement to members in three steps. Every notice is kept at the bottom of this card.</p>
      {mail && !mail.configured ? (
        <Banner tone="danger" title="Email is switched off.">
          RESEND_API_KEY is not set, so no notice can be emailed. Add it to the site&rsquo;s settings (.env.local on your computer, Vercel online).
        </Banner>
      ) : mail?.testMode ? (
        <Banner tone="warn" title="Email is in test mode.">
          Notices go out from <code>{mail.from}</code>, Resend&rsquo;s test sender, which only delivers to the owner of the Resend account. Members will not get
          them until EMAIL_FROM is set to an address on the verified domain.
        </Banner>
      ) : mail ? (
        <p className="m-0 text-[13px] text-muted">
          Sent from <code>{mail.from}</code>
        </p>
      ) : null}
      {err ? <Banner tone="danger">{err}</Banner> : null}

      {/* Step 1 */}
      <Step n={1} title="Who should get it?">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Who should get it">
          {KINDS.map(([k, label, sub]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-xl border-2 px-3 py-2.5 text-left ${kind === k ? "border-forest-800 bg-mist" : "border-line bg-paper hover:border-forest-800/50"}`}
            >
              <span className="block text-[14.5px] font-semibold text-ink">{label}</span>
              <span className="block text-[12.5px] text-muted">{sub}</span>
            </button>
          ))}
        </div>

        {kind === "zone" ? (
          <label className="flex max-w-sm flex-col gap-1 text-[13.5px] font-semibold text-ink">
            Which chapter?
            <select id="notice-zone" value={zone} onChange={(e) => setZone(e.target.value)} className={inputCls}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {kind === "pick" ? (
          <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input id="notice-find" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search by name, email or HBC number" className={`${inputCls} min-w-[220px] flex-1`} />
              <Btn size="sm" onClick={() => setPicked(new Set(pickList.map((p) => p.memberNo)))}>
                Tick all shown
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
                Clear
              </Btn>
            </div>
            <ul className="m-0 flex max-h-64 list-none flex-col gap-1 overflow-y-auto p-0">
              {pickList.map((p) => (
                <li key={p.memberNo}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-mist">
                    <input
                      type="checkbox"
                      checked={picked.has(p.memberNo)}
                      onChange={(e) =>
                        setPicked((s) => {
                          const n = new Set(s);
                          if (e.target.checked) n.add(p.memberNo);
                          else n.delete(p.memberNo);
                          return n;
                        })
                      }
                      className="h-4 w-4 accent-forest-800"
                    />
                    <span className="min-w-0 text-[14px]">
                      <span className="block font-semibold text-ink">{p.name}</span>
                      <span className="block text-[12.5px] break-all text-muted">
                        {p.email} · {p.memberNo}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {pickList.length === 0 ? <li className="px-2 text-[13.5px] text-muted">Nobody matches that search.</li> : null}
            </ul>
          </div>
        ) : null}

        <Recipients people={people} withoutEmail={withoutEmail} />
      </Step>

      {/* Step 2 */}
      <Step n={2} title="Write the notice">
        <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
          Subject
          <input
            id="notice-subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setPreview(null);
            }}
            placeholder="e.g. AGM date confirmed"
            maxLength={200}
            className={`${inputCls} font-normal`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
          Message
          <textarea
            id="notice-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setPreview(null);
            }}
            rows={6}
            placeholder={"Write it like a normal email.\n\nLeave an empty line between paragraphs."}
            className={`${inputCls} min-h-[140px] py-2 font-normal`}
          />
        </label>
        <p className="m-0 text-[12.5px] text-muted">
          Each member&rsquo;s email starts &ldquo;Dear [their first name]&rdquo; automatically. Put <code>**two stars**</code> around words to make them bold.
        </p>
      </Step>

      {/* Step 3 */}
      <Step n={3} title="Check and send">
        <div className="flex flex-wrap gap-2">
          <Btn disabled={!subject.trim() && !message.trim()} onClick={() => void showPreview()}>
            Preview the email
          </Btn>
          <Btn variant="primary" disabled={busy || !ready} onClick={() => void send()}>
            {busy ? "Sending…" : count ? `Send to ${count} member${count === 1 ? "" : "s"}` : "Send"}
          </Btn>
        </div>
        {!ready ? (
          <p className="m-0 text-[13px] text-muted">
            {count === 0 ? "Choose who gets it in step 1." : !subject.trim() ? "Write a subject in step 2." : "Write the message in step 2."}
          </p>
        ) : null}
        {outcome ? (
          outcome.error ? (
            <Banner tone="danger" title={outcome.sent ? `Only ${outcome.sent} of ${outcome.of} emails went out.` : `None of the ${outcome.of} emails went out.`}>
              {outcome.error}
            </Banner>
          ) : (
            <Banner tone="info" title={`Sent to ${outcome.sent} member${outcome.sent === 1 ? "" : "s"}.`}>
              Resend accepted every email. If one doesn&rsquo;t arrive in a few minutes, ask them to check spam or junk.
            </Banner>
          )
        ) : null}
        {preview ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <p className="m-0 border-b border-line bg-mist px-3 py-2 text-[13px] text-body">
              <strong>Subject:</strong> {preview.subject} <span className="text-muted">· as {preview.as} will see it</span>
            </p>
            <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[420px] w-full border-0 bg-paper" />
          </div>
        ) : null}
      </Step>

      {recent.length ? (
        <details className="rounded-[14px] border border-line p-4">
          <summary className="cursor-pointer text-[14.5px] font-semibold text-forest-800">Notices already sent ({recent.length})</summary>
          <ul className="mt-3 mb-0 flex list-none flex-col gap-3 p-0 text-[14px]">
            {recent.map((r) => (
              <li key={r.id} className="rounded-xl border border-line p-3">
                <strong className="block text-ink">{r.subject}</strong>
                <span className="block text-[12.5px] text-muted">
                  {r.at} by {r.by} · {r.audience} · {r.sent} of {r.recipients} sent{r.failed ? `, ${r.failed} failed` : ""}
                </span>
                {r.error ? <span className="mt-1 block text-[13px] text-danger">{r.error}</span> : null}
                {r.to.length ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[13px] font-semibold text-forest-800">Who got it</summary>
                    <ul className="m-0 mt-1 list-none p-0 text-[13px]">
                      {r.to.map((p) => (
                        <li key={p.memberNo}>
                          {p.name} <span className="text-muted">· {p.email}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4" aria-label={`Step ${n}: ${title}`}>
      <h3 className="m-0 flex items-center gap-2.5 text-[16px] font-bold text-ink">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest-800 text-[13px] text-paper">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The names and emails the notice will go to. */
function Recipients({ people, withoutEmail }: { people: Person[] | null; withoutEmail: number }) {
  const [all, setAll] = useState(false);
  if (!people) return <p className="m-0 text-[13.5px] text-muted">Working out who gets it…</p>;
  if (!people.length) return <p className="m-0 rounded-xl bg-mist px-3 py-2 text-[14px] text-body">Nobody yet. Choose who should get it above.</p>;
  const shown = all ? people : people.slice(0, 8);
  return (
    <div className="rounded-xl bg-mist p-3">
      <p className="m-0 mb-2 text-[14px] font-semibold text-forest-800">
        {people.length} member{people.length === 1 ? "" : "s"} will get it:
      </p>
      <ul className="m-0 grid list-none gap-1 p-0 sm:grid-cols-2">
        {shown.map((p) => (
          <li key={p.memberNo} className="min-w-0 rounded-lg bg-paper px-2.5 py-1.5 text-[13.5px]">
            <span className="block font-semibold text-ink">{p.name}</span>
            <span className="block text-[12px] break-all text-muted">{p.email}</span>
          </li>
        ))}
      </ul>
      {people.length > 8 ? (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 text-[13px] font-semibold text-forest-800 underline underline-offset-[3px]">
          {all ? "Show fewer" : `Show all ${people.length}`}
        </button>
      ) : null}
      {withoutEmail ? (
        <p className="m-0 mt-2 text-[12.5px] text-muted">
          {withoutEmail} member{withoutEmail === 1 ? " has" : "s have"} no email address and won&rsquo;t get it.
        </p>
      ) : null}
    </div>
  );
}
