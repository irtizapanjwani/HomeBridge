"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, DownloadIcon } from "@/components/ui/Icons";
import { Card } from "./bits";

export type MembershipView = {
  memberNo: string;
  certificateNo: string;
  category: string;
  chapter: string;
  admittedAt: string;
  receiptNo?: string;
};

const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-forest-800/30 bg-paper px-5 text-[15px] font-semibold text-ink hover:border-forest-800";

/** Brief Phase 2: "view membership details, certificate, receipts". Shown once a member is admitted. */
export function MembershipCard({ m }: { m: MembershipView }) {
  return (
    <Card className="!bg-forest-800 text-cream">
      <p className="m-0 flex items-center gap-2 text-[13px] font-semibold tracking-[0.08em] text-gold-soft uppercase">
        <CheckIcon size={16} strokeWidth={3} /> Member of HomeBridge Cooperative
      </p>
      <p className="mt-2 mb-0 font-mono text-[clamp(22px,4vw,30px)] font-bold tracking-wide text-cream">{m.memberNo}</p>
      <p className="mt-1 mb-0 text-[14px] text-[#D6DED8]">Your membership number — quote it on every payment, form and enquiry.</p>
      <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {[
          ["Category", `${m.category} member`],
          ["Chapter", m.chapter],
          ["Date admitted", m.admittedAt],
          ["Certificate", m.certificateNo],
          ...(m.receiptNo ? [["Joining fee receipt", m.receiptNo]] : []),
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[13px] text-[#A9B5AD]">{k}</dt>
            <dd className="m-0 text-[15.5px] font-semibold text-cream">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <a href="/api/member/certificate" target="_blank" rel="noopener" className={`${btn} !border-cream/40 !bg-transparent !text-cream hover:!bg-white/10`}>
          <DownloadIcon size={17} /> Membership certificate
        </a>
        {m.receiptNo ? (
          <a href="/api/member/receipt" target="_blank" rel="noopener" className={`${btn} !border-cream/40 !bg-transparent !text-cream hover:!bg-white/10`}>
            <DownloadIcon size={17} /> Joining fee receipt
          </a>
        ) : null}
      </div>
    </Card>
  );
}

const input =
  "block min-h-11 w-full rounded-xl border border-line-strong/70 bg-page px-3.5 py-2 text-[16px] text-ink focus:border-forest-800 focus:outline-none";

/** Brief Phase 2: "update contact details". Name, date of birth and email change through the office. */
export function ContactEditor({ initial, onDone }: { initial: { whatsapp: string; address: string; city: string }; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/member/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || `Could not save (error ${res.status}).`);
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 grid gap-4 border-t border-line pt-4">
      <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-ink">
        Phone / WhatsApp
        <input value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} className={input} inputMode="tel" autoComplete="tel" />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-ink">
        Home address
        <input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} className={input} autoComplete="street-address" />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-ink">
        Town or city
        <input value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} className={input} autoComplete="address-level2" />
      </label>
      {error && (
        <p role="alert" className="m-0 text-[14px] font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest-800 px-6 text-[15px] font-semibold text-cream hover:bg-forest-900 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save details"}
        </button>
        <button type="button" onClick={onDone} className={btn}>
          Cancel
        </button>
      </div>
    </div>
  );
}
