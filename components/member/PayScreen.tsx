"use client";

import { useId, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, ClipboardIcon, ShieldIcon } from "@/components/ui/Icons";
import { JOINING_FEE, SHARE_PRICE_NGN, SOCIETY_ACCOUNTS, type Currency } from "@/lib/settings";
import {
  AMOUNT_CHIPS,
  CONTRIBUTIONS,
  CURRENCY_SYMBOL,
  JOINING_FEE_PAID,
  MEMBER,
  formatDayMonth,
  formatMoney,
  formatNaira,
  illustrate,
} from "@/lib/member-data";
import { Card, SamplePill, btnPrimary } from "./bits";

const CURRENCIES: { id: Currency; label: string }[] = [
  { id: "NGN", label: "₦ Naira" },
  { id: "USD", label: "$ US dollar" },
  { id: "GBP", label: "£ Pound" },
];

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

const chipBase =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-[15px] font-semibold transition-colors";
const chipOn = "border-forest-800 bg-forest-800 text-cream";
const chipOff = "border-line-strong/60 bg-paper text-ink hover:border-forest-800";

export function PayScreen() {
  const toast = useToast();
  const id = useId();
  const [currency, setCurrency] = useState<Currency>(MEMBER.homeCurrency);
  const [chip, setChip] = useState<number | "other">(AMOUNT_CHIPS[MEMBER.homeCurrency][1]);
  const [other, setOther] = useState("");

  const otherNum = Number(other.replace(/,/g, ""));
  const amount = chip === "other" ? (Number.isFinite(otherNum) && otherNum > 0 ? otherNum : 0) : chip;
  const ill = illustrate(currency, amount);
  const acct = SOCIETY_ACCOUNTS[currency];
  const sym = CURRENCY_SYMBOL[currency];

  const pickCurrency = (c: Currency) => {
    setCurrency(c);
    setChip(AMOUNT_CHIPS[c][1]);
    setOther("");
  };

  const copy = async () => {
    const text = [
      `Bank: ${acct.bank}`,
      `Account name: ${acct.accountName}`,
      `Account number: ${acct.accountNumber}`,
      acct.extra ? `${acct.extra.label}: ${acct.extra.value}` : null,
      `Reference: ${MEMBER.number}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch {
      toast("Couldn’t copy automatically — please select the details and copy them.", "warn");
    }
  };

  return (
    <div className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,28px)] pt-[clamp(24px,4vw,44px)]">
      <h1 className="m-0 text-[clamp(32px,4.6vw,46px)] leading-[1.1] text-forest-800">Buy shares</h1>
      <p className="m-0 mt-3 max-w-[46em] text-[16.5px]">
        Pay from your own bank into HomeBridge&rsquo;s own account. Always use your member number as the reference — that is how we
        know it is yours.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 content-start gap-6">
          {/* Choose currency and amount */}
          <Card>
            <fieldset className="m-0 border-0 p-0">
              <legend className="p-0 text-[15px] font-semibold text-ink">I am paying in</legend>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {CURRENCIES.map((c) => (
                  <label key={c.id} className={`${chipBase} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold ${currency === c.id ? chipOn : chipOff}`}>
                    <input
                      type="radio"
                      name={`${id}-cur`}
                      value={c.id}
                      checked={currency === c.id}
                      onChange={() => pickCurrency(c.id)}
                      className="sr-only"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="m-0 mt-6 border-0 p-0">
              <legend className="p-0 text-[15px] font-semibold text-ink">Amount this month</legend>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {AMOUNT_CHIPS[currency].map((a) => (
                  <label key={a} className={`${chipBase} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold ${chip === a ? chipOn : chipOff}`}>
                    <input type="radio" name={`${id}-amt`} checked={chip === a} onChange={() => setChip(a)} className="sr-only" />
                    {formatMoney(currency, a, false)}
                  </label>
                ))}
                <label className={`${chipBase} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold ${chip === "other" ? chipOn : chipOff}`}>
                  <input type="radio" name={`${id}-amt`} checked={chip === "other"} onChange={() => setChip("other")} className="sr-only" />
                  Other
                </label>
              </div>
              {chip === "other" && (
                <div className="mt-4">
                  <label htmlFor={`${id}-other`} className="block text-[14.5px] font-medium text-ink">
                    Other amount ({sym})
                  </label>
                  <div className="mt-1.5 flex max-w-[240px] items-center rounded-xl border border-line-strong bg-paper focus-within:border-forest-800">
                    <span aria-hidden="true" className="pl-4 font-semibold text-muted">
                      {sym}
                    </span>
                    <input
                      id={`${id}-other`}
                      inputMode="decimal"
                      autoComplete="off"
                      value={other}
                      onChange={(e) => setOther(e.target.value.replace(/[^\d.,]/g, ""))}
                      placeholder="0"
                      className="min-h-12 w-full rounded-xl bg-transparent px-2 text-[16px] text-ink focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </fieldset>

            <div className="mt-6 rounded-2xl bg-mist px-5 py-4" aria-live="polite">
              {amount > 0 ? (
                <>
                  <p className="m-0 text-[15px] text-ink">
                    About{" "}
                    <strong className="text-[18px] font-bold text-forest-800">
                      {formatMoney(currency, amount, !Number.isInteger(amount))} → {ill.shares.toLocaleString("en-GB")}{" "}
                      {ill.shares === 1 ? "share" : "shares"}
                    </strong>{" "}
                    at {formatNaira(SHARE_PRICE_NGN)} each
                    {currency !== "NGN" && <span className="text-muted"> (≈ {formatNaira(ill.naira)})</span>}
                  </p>
                  {ill.credit > 0 && (
                    <p className="m-0 mt-1.5 text-[14.5px]">
                      {formatNaira(ill.credit)} is less than one share, so it&rsquo;s kept as unallocated credit and carried to your next payment.
                    </p>
                  )}
                  <p className="m-0 mt-1.5 text-[13.5px] text-muted">
                    {currency === "NGN"
                      ? "Shares are issued once the bank confirms your payment."
                      : "Converted to naira at the bank rate on the day received. Example rate only."}
                  </p>
                </>
              ) : (
                <p className="m-0 text-[15px]">Enter an amount to see roughly how many shares it buys.</p>
              )}
            </div>
            {ill.belowMinimum && (
              <p role="note" className="m-0 mt-3 rounded-2xl border border-gold/60 bg-butter px-5 py-3 text-[14.5px] text-ink">
                This is below the {formatMoney(ill.min.currency, ill.min.amount, false)} monthly minimum for diaspora members
                {currency !== ill.min.currency ? " (at the example rate)" : ""}. That&rsquo;s fine as a top-up — just make sure the month
                adds up to at least {formatMoney(ill.min.currency, ill.min.amount, false)} in total.
              </p>
            )}
          </Card>

          {/* Account details */}
          <section aria-labelledby="acct-h" className="rounded-[22px] bg-forest-800 p-[clamp(18px,3vw,28px)] text-cream">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 id="acct-h" className="m-0 text-[24px] text-cream">
                Pay into this account
              </h2>
              <p className="m-0 inline-flex items-center gap-1.5 text-[14px] text-on-dark">
                <ShieldIcon size={16} />
                Account in the Society&rsquo;s name · two signatories
              </p>
            </div>
            <dl className="m-0 mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["Bank", acct.bank],
                ["Account name", acct.accountName],
                ["Account number", acct.accountNumber],
                ...(acct.extra ? [[acct.extra.label, acct.extra.value]] : []),
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">{k}</dt>
                  <dd className="m-0 mt-1 text-[17px] font-semibold break-words text-cream">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gold px-5 py-4 text-forest-950">
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-bold tracking-[0.14em] uppercase">Your reference — always</p>
                <p className="m-0 mt-0.5 text-[clamp(20px,3vw,26px)] font-bold tracking-[0.06em] break-all">{MEMBER.number}</p>
              </div>
              <button
                type="button"
                onClick={copy}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-cream hover:bg-forest-950"
              >
                <ClipboardIcon size={18} />
                Copy details
              </button>
            </div>
            <p className="m-0 mt-4 text-[14px] text-on-dark">
              Never pay in cash or to any person&rsquo;s account, even if asked. HomeBridge will never message you a different account.
            </p>
          </section>

          <ReceiptUpload />
        </div>

        {/* Side column */}
        <div className="grid min-w-0 content-start gap-6">
          <Card as="section" aria-labelledby="fee-h" className="p-6!">
            <h2 id="fee-h" className="eyebrow">
              Joining fee
            </h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="m-0 text-[24px] font-bold text-ink">{formatMoney(JOINING_FEE_PAID.currency, JOINING_FEE_PAID.amount)}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1 text-[12.5px] font-bold tracking-wide text-forest-800">
                <CheckIcon size={13} />
                PAID
              </span>
            </div>
            <p className="m-0 mt-2 text-[14.5px]">
              {JOINING_FEE_PAID.method} · paid to {JOINING_FEE.payee} (manager) · receipt emailed. One-off, not a share.
            </p>
          </Card>

          <Card as="section" aria-labelledby="recent-h" className="p-6!">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-h" className="eyebrow">
                Recent payments
              </h2>
              <SamplePill />
            </div>
            <ul className="m-0 mt-3 list-none p-0">
              {CONTRIBUTIONS.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 border-b border-line py-3 last:border-0 last:pb-0">
                  <div className="min-w-0 text-[15px]">
                    <p className="m-0 text-ink">
                      {formatDayMonth(c.date)} · {c.kind === "shares" ? c.account : "Joining fee"}
                    </p>
                    <p className="m-0 text-[13.5px] text-muted">{c.kind === "shares" ? `${c.status} · ${c.shares} shares` : c.account}</p>
                  </div>
                  <p className="m-0 font-semibold text-ink tabular-nums">{formatMoney(c.currency, c.amount)}</p>
                </li>
              ))}
            </ul>
          </Card>

          <aside className="rounded-[22px] bg-cream p-6">
            <h2 className="m-0 font-sans text-[16px] font-semibold text-forest-800">Set it and forget it</h2>
            <p className="m-0 mt-1.5 text-[14.5px]">
              A monthly standing order from your bank keeps you on track. Use the same account and reference.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReceiptUpload() {
  const toast = useToast();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (f: File | null) => {
    setError("");
    setFile(null);
    if (!f) return;
    if (!ACCEPT.includes(f.type) && !/\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(f.name)) {
      setError("Please choose a photo (JPG, PNG, WebP, HEIC) or a PDF.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`That file is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`);
      return;
    }
    setFile(f);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(error || "Choose your receipt first.");
      return;
    }
    toast("Receipt received (preview) — we’ll match it to the bank statement, usually within 1 working day.");
    setFile(null);
    setOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Card aria-labelledby={`${id}-h`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="m-0 min-w-0 flex-1 basis-[20em] text-[15.5px]">
          <strong id={`${id}-h`} className="font-semibold text-forest-800">
            Paid already?
          </strong>{" "}
          Upload your receipt and we will match it faster. Shares appear on your dashboard once the bank confirms, usually within 1
          working day.
        </p>
        {!open && (
          <button type="button" className={btnPrimary} onClick={() => setOpen(true)} aria-expanded={false} aria-controls={`${id}-form`}>
            I&rsquo;ve paid — upload receipt
          </button>
        )}
      </div>
      {open && (
        <form id={`${id}-form`} onSubmit={submit} noValidate className="mt-5 border-t border-line pt-5">
          <label htmlFor={`${id}-file`} className="block text-[15px] font-semibold text-ink">
            Your bank receipt or screenshot
          </label>
          <p id={`${id}-hint`} className="m-0 mt-0.5 text-[13.5px] text-muted">
            Photo or PDF, up to 5 MB. Make sure the reference {MEMBER.number} is visible.
          </p>
          <input
            ref={inputRef}
            id={`${id}-file`}
            type="file"
            accept="image/*,application/pdf"
            aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
            aria-invalid={error ? true : undefined}
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
            className="mt-3 block w-full max-w-full text-[15px] text-body file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-full file:border file:border-forest-800 file:bg-paper file:px-5 file:font-semibold file:text-forest-800 hover:file:bg-mist"
          />
          {file && (
            <p className="m-0 mt-2 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-forest-800">
              <CheckIcon size={16} />
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
          {error && (
            <p id={`${id}-err`} role="alert" className="m-0 mt-2 text-[14.5px] font-medium text-danger">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className={btnPrimary}>
              Send receipt
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setFile(null);
                setError("");
              }}
              className="inline-flex min-h-11 items-center px-3 font-semibold text-forest-800 underline underline-offset-[3px]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
