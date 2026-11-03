"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Banner, Btn, Card, CardTitle, Pill, inputCls } from "../ui";

type Recent = { id: string; subject: string; audience: string; recipients: number; sent: number; failed: number; by: string; at: string };
type Kind = "all" | "zone" | "behind";

/**
 * Member Platform brief §6 "Broadcast": a notice to all members, one chapter, or the members behind
 * on this month's contribution. Email for now; WhatsApp and SMS once those are connected.
 */
export function NoticesCard() {
  const toast = useToast();
  const [zones, setZones] = useState<string[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [kind, setKind] = useState<Kind>("all");
  const [zone, setZone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState<{ count: number; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/notices")
      .then((r) => r.json())
      .then((d: { ok?: boolean; zones?: string[]; recent?: Recent[]; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load notices.");
        setZones(d.zones ?? []);
        setRecent(d.recent ?? []);
        setZone((z) => z || d.zones?.[0] || "");
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  const audience = kind === "zone" ? { kind, zone } : { kind };

  // Recount whenever the choice changes, so the officer always sees how many will get it.
  useEffect(() => {
    if (kind === "zone" && !zone) return setCount(null);
    let live = true;
    fetch("/api/admin/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, preview: true }) })
      .then((r) => r.json())
      .then((d: { ok?: boolean; count?: number; label?: string }) => live && d.ok && setCount({ count: d.count ?? 0, label: d.label ?? "" }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [kind, zone]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!count?.count) return;
    if (!window.confirm(`Email “${subject}” to ${count.count} member${count.count === 1 ? "" : "s"} (${count.label}) now?`)) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, subject, message }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; sent?: number; failed?: number; recipients?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || "The notice could not be sent.");
      toast(`${d.sent} of ${d.recipients} sent${d.failed ? `, ${d.failed} failed — see the audit log` : ""}.`, d.failed ? "warn" : undefined);
      setSubject("");
      setMessage("");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The notice could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="notices" aside={<Pill tone="green">Live</Pill>}>
        Send a notice to members
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        Goes by email (WhatsApp and SMS later). Write as you would an email: a blank line starts a new paragraph, <strong>**two stars**</strong>{" "}
        make words bold, and {"{{FirstName}}"} fills in each member&rsquo;s first name. Every notice is kept below and in the audit log.
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Send to
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={inputCls}>
            <option value="all">All members</option>
            <option value="zone">One chapter</option>
            <option value="behind">Members behind this month</option>
          </select>
        </label>
        {kind === "zone" ? (
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Chapter
            <select value={zone} onChange={(e) => setZone(e.target.value)} className={inputCls}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {count ? (
          <span className="pb-3 text-[14px] font-semibold text-forest-800">
            {count.count} member{count.count === 1 ? "" : "s"} will get it
          </span>
        ) : null}
      </div>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" maxLength={200} className={inputCls} aria-label="Subject" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} placeholder="Message" className={`${inputCls} py-2`} aria-label="Message" />
      <div>
        <Btn variant="primary" disabled={busy || !subject.trim() || message.trim().length < 5 || !count?.count} onClick={() => void send()}>
          {busy ? "Sending…" : "Send notice"}
        </Btn>
      </div>
      {recent.length ? (
        <details className="rounded-[14px] border border-line p-4">
          <summary className="cursor-pointer text-[14.5px] font-semibold text-forest-800">Notices sent</summary>
          <ul className="mt-3 mb-0 flex list-none flex-col gap-2 p-0 text-[14px]">
            {recent.map((r) => (
              <li key={r.id}>
                <strong>{r.subject}</strong> · {r.audience} · {r.sent} of {r.recipients} sent{r.failed ? `, ${r.failed} failed` : ""} · {r.at} by {r.by}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
