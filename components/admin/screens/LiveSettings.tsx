"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Banner, Btn, Card, CardTitle, Pill, inputCls } from "../ui";

/**
 * Settings that are saved to the database and take effect straight away, unlike the demonstration
 * settings further down this screen. Each change is recorded in the audit log.
 */
export function WelcomeAutoSendCard() {
  const toast = useToast();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/welcome-auto-send")
      .then((r) => r.json())
      .then((d: { ok?: boolean; on?: boolean; error?: string }) => (d.ok ? setOn(Boolean(d.on)) : setErr(d.error || "Could not read the setting.")))
      .catch(() => setErr("Could not reach the server."));
  }, []);

  async function flip() {
    if (on === null) return;
    const next = !on;
    if (next && !window.confirm("Send the welcome pack automatically to every member who is approved and has a confirmed fee, from now on?")) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/settings/welcome-auto-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: next }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "Could not save the setting.");
      setOn(next);
      toast(next ? "Welcome packs now send automatically." : "Welcome packs are now sent by hand.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the setting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="welcome-auto" aside={on === null ? null : <Pill tone={on ? "green" : "grey"}>{on ? "Automatic" : "By hand"}</Pill>}>
        Welcome pack
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        When this is on, the welcome email and pack go out by themselves as soon as a member is <strong>approved</strong> and their{" "}
        <strong>joining fee is confirmed</strong>, whichever happens second. Each member gets it once. When it is off, an officer sends it
        with the <em>Send welcome pack</em> button. On by default.
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      <div>
        <Btn variant={on ? "outline" : "primary"} disabled={busy || on === null} onClick={() => void flip()}>
          {on === null ? "Loading…" : busy ? "Saving…" : on ? "Switch to sending by hand" : "Send automatically"}
        </Btn>
      </div>
    </Card>
  );
}

type TemplateRow = {
  key: string;
  name: string;
  when: string;
  placeholders: { name: string; description: string }[];
  blocks: { name: string; description: string }[];
  subject: string;
  body: string;
  isDefault: boolean;
  defaultSubject: string;
  defaultBody: string;
};

/**
 * Brief p.4: "All email and document templates must be editable by the VEKAT Manager without a
 * developer." The office edits each email's subject and wording here, previews it with sample
 * details, and saves; the next email of that kind uses the new wording. Reset goes back to the
 * original. Every save and reset is recorded in the audit log.
 */
export function EmailTemplatesCard() {
  const toast = useToast();
  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [key, setKey] = useState("A");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [bodyEl, setBodyEl] = useState<HTMLTextAreaElement | null>(null);

  const current = rows?.find((r) => r.key === key) ?? null;
  const dirty = Boolean(current && (subject !== current.subject || body !== current.body));

  function load(select?: string) {
    fetch("/api/admin/settings/templates")
      .then((r) => r.json())
      .then((d: { ok?: boolean; templates?: TemplateRow[]; error?: string }) => {
        if (!d.ok || !d.templates) return setErr(d.error || "Could not load the templates.");
        setRows(d.templates);
        const pick = d.templates.find((t) => t.key === (select ?? key)) ?? d.templates[0];
        setKey(pick.key);
        setSubject(pick.subject);
        setBody(pick.body);
        setPreview(null);
        setProblem("");
      })
      .catch(() => setErr("Could not reach the server."));
  }
  useEffect(() => load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(k: string) {
    if (dirty && !window.confirm("You have unsaved changes to this email. Discard them?")) return;
    const r = rows?.find((x) => x.key === k);
    if (!r) return;
    setKey(k);
    setSubject(r.subject);
    setBody(r.body);
    setPreview(null);
    setProblem("");
  }

  /** Puts a placeholder where the cursor is in the message. */
  function insert(token: string) {
    const el = bodyEl;
    if (!el) return setBody((b) => b + token);
    const at = el.selectionStart ?? body.length;
    const next = body.slice(0, at) + token + body.slice(el.selectionEnd ?? at);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = at + token.length;
    });
  }

  async function call(action: "preview" | "save" | "reset") {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/settings/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, key, subject, body }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; subject?: string; html?: string; problem?: string | null };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      if (action === "preview") {
        setPreview({ subject: d.subject ?? "", html: d.html ?? "" });
        setProblem(d.problem ?? "");
      } else {
        toast(action === "save" ? "Template saved. The next email of this kind uses it." : "Template reset to the original wording.");
        load(key);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="email-templates" aside={current ? <Pill tone={current.isDefault ? "grey" : "warm"}>{current.isDefault ? "Original wording" : "Edited"}</Pill> : null}>
        Email templates
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        Change what each email says. Words in <code>{"{{double braces}}"}</code> are filled in for each person. A blank line starts a new
        paragraph, <code>- </code> starts a bullet, <code>1. </code> a numbered step, <code>## </code> a heading, and <code>**two stars**</code>{" "}
        make words bold. Preview before saving.
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {!rows ? (
        <p className="m-0 text-[14px] text-muted">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Email">
            {rows.map((r) => (
              <Btn key={r.key} size="sm" variant={r.key === key ? "primary" : "outline"} aria-pressed={r.key === key} onClick={() => choose(r.key)}>
                {r.name}
              </Btn>
            ))}
          </div>
          {current ? <p className="m-0 text-[13px] text-muted">{current.when}</p> : null}

          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-11 rounded-xl border border-line bg-paper px-3 text-[14px] font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
            Message
            <textarea
              ref={setBodyEl}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              className="rounded-xl border border-line bg-paper p-3 font-mono text-[13px] leading-relaxed font-normal"
            />
          </label>

          {current ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[13px] font-semibold text-muted">Click to insert at the cursor:</p>
              <div className="flex flex-wrap gap-1.5">
                {[...current.placeholders, ...current.blocks].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    title={p.description}
                    onClick={() => insert(current.blocks.some((b) => b.name === p.name) ? `\n\n{{${p.name}}}\n\n` : `{{${p.name}}}`)}
                    className="rounded-full border border-line bg-mist px-2.5 py-1 font-mono text-[12px] text-forest-800 hover:border-forest-800"
                  >
                    {`{{${p.name}}}`}
                  </button>
                ))}
              </div>
              <p className="m-0 text-[12px] text-muted">Hover a placeholder to see what it holds. The capitalised ones are ready-made blocks and go on a line of their own.</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Btn disabled={busy} onClick={() => void call("preview")}>
              Preview
            </Btn>
            <Btn variant="primary" disabled={busy || !dirty} onClick={() => void call("save")}>
              {busy ? "Saving…" : "Save"}
            </Btn>
            <Btn
              variant="ghost"
              disabled={busy || !current || current.isDefault}
              onClick={() => {
                if (window.confirm("Go back to the original wording for this email? Your edits will be lost.")) void call("reset");
              }}
            >
              Reset to original
            </Btn>
          </div>

          {problem ? <Banner tone="warn">{problem}</Banner> : null}
          {preview ? (
            <div className="flex flex-col gap-2 rounded-[14px] border border-line p-3">
              <p className="m-0 text-[13px]">
                <span className="text-muted">Subject:</span> <strong>{preview.subject}</strong>
              </p>
              <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="h-[560px] w-full rounded-[10px] border border-line bg-white" />
              <p className="m-0 text-[12px] text-muted">Shown with sample details. Real emails use each person&rsquo;s own.</p>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

/**
 * Brief Phase 2: "Automatic reminders at 7 and 14 days if not returned". When on, a daily job sends
 * Email E to members whose declaration or nominee form is still unsigned 7 and 14 days after their
 * welcome pack. "Send due reminders now" runs the same check straight away.
 */
export function FormsRemindersCard() {
  const toast = useToast();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/forms-reminders")
      .then((r) => r.json())
      .then((d: { ok?: boolean; on?: boolean; error?: string }) => (d.ok ? setOn(Boolean(d.on)) : setErr(d.error || "Could not read the setting.")))
      .catch(() => setErr("Could not reach the server."));
  }, []);

  async function post(body: { on?: boolean; run?: boolean }) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/settings/forms-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; on?: boolean; checked?: number; sent?: number; failed?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      if (body.run) {
        toast(
          d.sent || d.failed
            ? `${d.sent} reminder${d.sent === 1 ? "" : "s"} sent${d.failed ? `, ${d.failed} failed — see the audit log` : ""}.`
            : "No reminders are due right now.",
          d.failed ? "warn" : undefined,
        );
      } else {
        setOn(Boolean(d.on));
        toast(d.on ? "Forms reminders now send automatically each morning." : "Forms reminders switched off.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="forms-reminders" aside={on === null ? null : <Pill tone={on ? "green" : "grey"}>{on ? "Automatic" : "Off"}</Pill>}>
        Forms reminders
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        When this is on, members who have not signed their declaration or nominee form get Email E <strong>7 days</strong> and again{" "}
        <strong>14 days</strong> after their welcome pack, checked every morning at 08:00 Lagos time. Each reminder goes once. The wording is
        email E under Email templates. On by default.
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      <div className="flex flex-wrap gap-2">
        <Btn
          variant={on ? "outline" : "primary"}
          disabled={busy || on === null}
          onClick={() => {
            if (!on && !window.confirm("Send forms reminders automatically from now on?")) return;
            void post({ on: !on });
          }}
        >
          {on === null ? "Loading…" : on ? "Switch off" : "Send automatically"}
        </Btn>
        <Btn disabled={busy} onClick={() => void post({ run: true })}>
          Send due reminders now
        </Btn>
      </div>
    </Card>
  );
}

type PaymentRun = {
  skipped?: "off" | null;
  day?: number;
  stage?: string | null;
  checked?: number;
  upToDate?: number;
  sent?: number;
  failed?: number;
  arrearsNotices?: number;
  overdue?: number;
  digest?: string;
};

const DIGEST_TEXT: Record<string, string> = {
  sent: "The office's overdue list was emailed.",
  none_overdue: "Nobody is overdue, so no office list was needed.",
  already_today: "The office's overdue list already went today.",
  no_address: "No office address is set for the overdue list (OFFICE_ALERT_EMAIL).",
  failed: "The office's overdue list could not be emailed. See the audit log.",
};

/**
 * Member Platform brief §4: due on day 1, reminders on days 5 and 7, overdue on day 8 with a daily
 * list for the office, a second notice on day 15, and a formal notice at 2, 3 and 6 months in a
 * row. When on, a daily job does all of it. The test buttons run the same check as if today were a
 * chosen day, so the whole month can be tried in a few minutes with test members.
 */
export function PaymentRemindersCard() {
  const toast = useToast();
  const [on, setOn] = useState<boolean | null>(null);
  const [today, setToday] = useState<{ day: number; period: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [testDay, setTestDay] = useState(1);
  const [last, setLast] = useState<PaymentRun | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/payment-reminders")
      .then((r) => r.json())
      .then((d: { ok?: boolean; on?: boolean; today?: { day: number; period: string }; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not read the setting.");
        setOn(Boolean(d.on));
        setToday(d.today ?? null);
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);

  async function post(body: { on?: boolean; run?: boolean; testDay?: number; clear?: boolean }) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/settings/payment-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => ({}))) as PaymentRun & { ok?: boolean; error?: string; on?: boolean; cleared?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      if (body.clear) {
        setLast(null);
        toast(`This month's payment-email history cleared for ${d.cleared ?? 0} member${d.cleared === 1 ? "" : "s"}. You can test again from day 1.`);
      } else if (body.run) {
        setLast(d);
        toast(
          d.sent || d.failed || d.arrearsNotices
            ? `${d.sent} email${d.sent === 1 ? "" : "s"} sent${d.arrearsNotices ? `, ${d.arrearsNotices} months-in-a-row notice${d.arrearsNotices === 1 ? "" : "s"}` : ""}${d.failed ? `, ${d.failed} failed — see the audit log` : ""}.`
            : "No payment emails were due.",
          d.failed ? "warn" : undefined,
        );
      } else {
        setOn(Boolean(d.on));
        toast(d.on ? "Payment reminders now send automatically each morning." : "Payment reminders switched off.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="payment-reminders" aside={on === null ? null : <Pill tone={on ? "green" : "grey"}>{on ? "Automatic" : "Off"}</Pill>}>
        Payment reminders
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        When this is on, every morning at 08:00 Lagos time each member who has not paid this month&rsquo;s minimum gets the right email:{" "}
        <strong>day 1</strong> due (G), <strong>day 5</strong> reminder (H), <strong>day 7</strong> last day (I), <strong>day 8</strong> overdue
        (F), <strong>day 15</strong> second notice (J). At 2, 3 and 6 months in a row they also get notice K. From day 8 the office gets one list a
        day of everyone overdue. Each email goes once, and a member who pays stops getting them. New members start the month after they are
        admitted. On by default.
      </p>
      {today ? <p className="m-0 text-[13px] text-muted">Today is day {today.day} of the month in Lagos.</p> : null}
      {err ? <Banner tone="danger">{err}</Banner> : null}
      <div className="flex flex-wrap gap-2">
        <Btn
          variant={on ? "outline" : "primary"}
          disabled={busy || on === null}
          onClick={() => {
            if (!on && !window.confirm("Send payment reminders to members automatically from now on?")) return;
            void post({ on: !on });
          }}
        >
          {on === null ? "Loading…" : on ? "Switch off" : "Send automatically"}
        </Btn>
        <Btn disabled={busy} onClick={() => void post({ run: true })}>
          Send today&rsquo;s due emails now
        </Btn>
      </div>

      <details className="rounded-[14px] border border-line p-4">
        <summary className="cursor-pointer text-[14.5px] font-semibold text-forest-800">Test the month (test members only)</summary>
        <p className="mt-3 mb-0 text-[13.5px] text-body">
          Runs the check as if today were the day you pick, so you can try day 1, 5, 7, 8 and 15 one after another. In a test, members
          admitted this month are included and the office list always goes. These are real emails to real addresses.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Pretend today is day
            <select value={testDay} onChange={(e) => setTestDay(Number(e.target.value))} className={inputCls}>
              {[1, 5, 7, 8, 15].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <Btn
            variant="primary"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Email every unpaid member as if today were day ${testDay}? Use test members only.`)) return;
              void post({ run: true, testDay });
            }}
          >
            Run test
          </Btn>
          <Btn
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Forget which payment emails went out this month, so you can test again from day 1?")) return;
              void post({ clear: true });
            }}
          >
            Start test over
          </Btn>
        </div>
      </details>

      {last ? (
        <Banner tone={last.failed ? "warn" : "info"}>
          Day {last.day}
          {last.stage ? ` · ${last.stage}` : ""}: {last.checked} member{last.checked === 1 ? "" : "s"} checked, {last.upToDate} paid, {last.sent} email
          {last.sent === 1 ? "" : "s"} sent
          {last.arrearsNotices ? `, ${last.arrearsNotices} months-in-a-row notice${last.arrearsNotices === 1 ? "" : "s"}` : ""}
          {last.failed ? `, ${last.failed} failed` : ""}.{" "}
          {last.day && last.day >= 8 ? `${last.overdue} overdue. ${DIGEST_TEXT[last.digest ?? ""] ?? ""}` : ""}
        </Banner>
      ) : null}
    </Card>
  );
}

/**
 * Member Platform brief §3: "Monthly e-statement emailed on day 10" and "Annual statement (PDF) for
 * the AGM". When on, the daily job sends each member last month's statement once, from the 10th.
 */
export function StatementsCard() {
  const toast = useToast();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  useEffect(() => {
    fetch("/api/admin/settings/statements")
      .then((r) => r.json())
      .then((d: { ok?: boolean; on?: boolean; error?: string }) => (d.ok ? setOn(Boolean(d.on)) : setErr(d.error || "Could not read the setting.")))
      .catch(() => setErr("Could not reach the server."));
  }, []);

  async function post(body: { on?: boolean; monthly?: boolean; annual?: number; clear?: boolean }) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/settings/statements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; on?: boolean; sent?: number; failed?: number; alreadySent?: number; cleared?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      if (body.clear) toast(`Statement history cleared for ${d.cleared ?? 0} members. You can send again.`);
      else if (body.monthly || body.annual) {
        toast(
          `${d.sent ?? 0} statement${d.sent === 1 ? "" : "s"} sent${d.alreadySent ? `, ${d.alreadySent} already had it` : ""}${d.failed ? `, ${d.failed} failed — see the audit log` : ""}.`,
          d.failed ? "warn" : undefined,
        );
      } else {
        setOn(Boolean(d.on));
        toast(d.on ? "Monthly statements now send automatically on the 10th." : "Monthly statements switched off.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="statements" aside={on === null ? null : <Pill tone={on ? "green" : "grey"}>{on ? "Automatic" : "Off"}</Pill>}>
        Member statements
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        When this is on, every member gets last month&rsquo;s statement (PDF) by email on the <strong>10th</strong> (Email M). Each statement
        goes once. Annual statements for the AGM (Email N) go when you click below. Members can also download a statement for any months from
        their account. Keep it off while testing with real records.
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      <div className="flex flex-wrap items-end gap-2">
        <Btn
          variant={on ? "outline" : "primary"}
          disabled={busy || on === null}
          onClick={() => {
            if (!on && !window.confirm("Email monthly statements to members automatically from now on?")) return;
            void post({ on: !on });
          }}
        >
          {on === null ? "Loading…" : on ? "Switch off" : "Send automatically"}
        </Btn>
        <Btn
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Email every member their statement for last month now?")) return;
            void post({ monthly: true });
          }}
        >
          Send last month&rsquo;s statements now
        </Btn>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Annual statements for
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls}>
            {[thisYear - 1, thisYear].filter((y) => y >= 2026).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <Btn
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Email every member their annual statement for ${year}?`)) return;
            void post({ annual: year });
          }}
        >
          Send annual statements
        </Btn>
        <Btn
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Forget that last month's and this year's statements were sent, so you can test again?")) return;
            void post({ clear: true });
          }}
        >
          Start test over
        </Btn>
      </div>
    </Card>
  );
}
