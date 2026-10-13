"use client";

import { useId, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { MAX_PROXIES } from "@/lib/settings";
import { MEMBER, MEMBER_NUMBER_PATTERN } from "@/lib/member-data";
import { btnPrimary, btnSecondary } from "./bits";

/** "Appoint a proxy" button and its dialog (bye-law 16.4). Nothing is sent in the preview. */
export function ProxyDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();
  const id = useId();

  const open = () => {
    setValue("");
    setError("");
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim().toUpperCase();
    if (!v) return setError("Enter the member number of the person you want to appoint.");
    if (!MEMBER_NUMBER_PATTERN.test(v)) return setError("Member numbers look like HB-ED-UK-000123 — please check and try again.");
    if (v === MEMBER.number) return setError("That is your own member number. Your proxy must be another member.");
    close();
    toast("Proxy request saved (preview)");
  };

  return (
    <>
      <button type="button" onClick={open} className={btnSecondary}>
        Appoint a proxy
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[min(92vw,480px)] rounded-[22px] border border-line bg-paper p-0 text-body backdrop:bg-forest-950/60"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <form onSubmit={submit} noValidate className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${id}-title`} className="m-0 text-[24px] text-forest-800">
              Appoint a proxy
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-forest-800 hover:bg-mist"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          <p className="m-0 mt-3 text-[15px]">
            If you can&rsquo;t attend a general meeting, another member can vote for you. Your proxy must be a HomeBridge member,
            and no one may hold more than {MAX_PROXIES} proxies (bye-law 16.4).
          </p>
          <label htmlFor={`${id}-num`} className="mt-5 block text-[15px] font-semibold text-ink">
            Their member number
          </label>
          <input
            id={`${id}-num`}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="HB-ED-UK-000123"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
            className="mt-2 block min-h-12 w-full rounded-xl border border-line-strong bg-paper px-4 text-[16px] tracking-wide text-ink uppercase placeholder:text-muted/70 placeholder:normal-case focus:border-forest-800 focus:outline-none focus-visible:outline-3 focus-visible:outline-gold"
          />
          <p id={`${id}-hint`} className="m-0 mt-1.5 text-[13.5px] text-muted">
            Format HB-XX-XX-000000. It&rsquo;s on their dashboard and welcome email.
          </p>
          {error && (
            <p id={`${id}-err`} role="alert" className="m-0 mt-2 text-[14px] font-medium text-danger">
              {error}
            </p>
          )}
          <p className="m-0 mt-4 rounded-xl bg-mist px-4 py-3 text-[14px]">
            Saving this gives the Society your written notice of the proxy. In this preview nothing is sent.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className={btnPrimary}>
              Save proxy
            </button>
            <button type="button" onClick={close} className={btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
