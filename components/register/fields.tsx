"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/Icons";

export const inputClass =
  "block min-h-12 w-full rounded-xl border border-line-strong/70 bg-paper px-4 py-2.5 text-[16px] text-ink placeholder:text-muted/70 " +
  "focus:border-forest-800 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-gold " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:bg-[#fdf6f3]";

export function ErrorText({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex gap-1.5 text-[14px] font-medium text-danger">
      <span aria-hidden="true" className="mt-[3px] inline-block size-3.5 shrink-0 rounded-full bg-danger text-center text-[10px] leading-[14px] font-bold text-white">
        !
      </span>
      <span>{children}</span>
    </p>
  );
}

type FieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: (a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
  className?: string;
};

/** Label, hint, control and error, wired together with aria-describedby. */
export function Field({ id, label, hint, error, optional, children, className = "" }: FieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted">(optional)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-0.5 mb-2 text-[14px] leading-snug text-muted">
          {hint}
        </p>
      )}
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </div>
  );
}

type Option = { value: string; label: string; sub?: string };

/**
 * Native radio buttons styled as selectable cards or rows. Arrow keys move between options as usual.
 * The first option carries the group's id so validation can focus it.
 */
export function ChoiceGroup({
  id,
  legend,
  hint,
  options,
  value,
  onChange,
  error,
  layout = "cards",
}: {
  id: string;
  legend: ReactNode;
  hint?: ReactNode;
  options: readonly Option[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  layout?: "cards" | "rows" | "pair";
}) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  const grid =
    layout === "cards"
      ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      : layout === "pair"
        ? "grid gap-3 sm:grid-cols-2"
        : "grid gap-3";
  return (
    <fieldset aria-describedby={describedBy} aria-invalid={!!error || undefined}>
      <legend className="mb-1.5 text-[15px] font-semibold text-ink">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="-mt-0.5 mb-3 text-[14px] leading-snug text-muted">
          {hint}
        </p>
      )}
      <div className={grid}>
        {options.map((o, i) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={`relative flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold ${
                checked
                  ? layout === "rows"
                    ? "border-forest-800 bg-mist"
                    : "border-forest-800 bg-forest-800 text-cream"
                  : `${error ? "border-danger/60" : "border-line"} bg-paper hover:border-forest-600`
              }`}
            >
              <input
                type="radio"
                name={id}
                id={i === 0 ? id : `${id}-${o.value}`}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                  checked ? (layout === "rows" ? "border-forest-800 bg-forest-800 text-cream" : "border-gold bg-gold text-forest-900") : "border-line-strong bg-paper"
                }`}
              >
                {checked && <CheckIcon size={12} strokeWidth={3.2} />}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[15.5px] leading-snug ${
                    !checked ? "font-medium text-ink" : layout === "rows" ? "font-semibold text-forest-800" : "font-semibold text-cream"
                  }`}
                >
                  {o.label}
                </span>
                {o.sub && (
                  <span className={`mt-0.5 block text-[13.5px] leading-snug ${checked && layout !== "rows" ? "text-on-dark" : "text-muted"}`}>{o.sub}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </fieldset>
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex min-h-12 cursor-pointer gap-3.5 rounded-2xl border px-4 py-3.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold ${
          checked ? "border-forest-800/40 bg-mist" : error ? "border-danger/60 bg-paper" : "border-line bg-paper"
        }`}
      >
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-md border-2 ${
            checked ? "border-forest-800 bg-forest-800 text-cream" : "border-line-strong bg-paper"
          }`}
        >
          {checked && <CheckIcon size={14} strokeWidth={3} />}
        </span>
        <span className="text-[15px] leading-relaxed text-body">{children}</span>
      </label>
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </div>
  );
}

export function Note({ children, tone = "mist" }: { children: ReactNode; tone?: "mist" | "butter" }) {
  return (
    <div className={`rounded-2xl px-4 py-3.5 text-[14.5px] leading-relaxed ${tone === "mist" ? "bg-mist text-forest-900" : "bg-butter text-gold-ink"}`}>
      {children}
    </div>
  );
}
