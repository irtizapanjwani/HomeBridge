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
