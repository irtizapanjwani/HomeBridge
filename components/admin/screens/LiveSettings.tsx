"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Banner, Btn, Card, CardTitle, Pill } from "../ui";

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
        with the <em>Send welcome pack</em> button. Keep it off while testing with real records.
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
