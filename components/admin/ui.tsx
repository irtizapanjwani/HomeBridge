"use client";

// Small shared building blocks for the back office, in the redesign style:
// flat white cards with a 1px line border, Lora headings, Poppins body, calm pill statuses.

import { useEffect, useId, useRef } from "react";
import { CloseIcon, LockIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------------- Page header ---------------- */

export function SampleData() {
  return <span className="inline-flex items-center rounded-full bg-[#EDE4C4] px-2.5 py-0.5 text-[12px] font-semibold text-[#5B5232]">Sample data</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="m-0 font-display text-[clamp(26px,3vw,34px)] leading-tight font-bold text-forest-800">{title}</h1>
        <p className="m-0 mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] text-muted">
          {subtitle}
          {subtitle ? <span aria-hidden="true">·</span> : null}
          <SampleData />
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}

/* ---------------- Cards and tiles ---------------- */

export function Card({ children, className, as: As = "section", ...rest }: { children: React.ReactNode; className?: string; as?: "section" | "div" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cx("rounded-[18px] border border-line/80 bg-paper", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardTitle({ children, aside, id }: { children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="m-0 font-display text-[19px] font-bold text-forest-800">
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function StatTile({ label, value, sub, tone = "plain" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "plain" | "warm" }) {
  return (
    <div className={cx("flex min-w-0 flex-col rounded-[18px] px-5 py-4", tone === "warm" ? "bg-[#FCF1D4]" : "border border-line/80 bg-paper")}>
      <span className={cx("text-[13px]", tone === "warm" ? "text-[#7A6320]" : "text-muted")}>{label}</span>
      <span className={cx("mt-0.5 truncate font-display text-[28px] leading-tight font-bold", tone === "warm" ? "text-[#9A5B0B]" : "text-forest-800")}>{value}</span>
      {sub ? <span className={cx("mt-1 text-[12.5px]", tone === "warm" ? "text-[#7A6320]" : "text-muted")}>{sub}</span> : null}
    </div>
  );
}

/* ---------------- Pills ---------------- */

export type Tone = "green" | "warm" | "red" | "grey" | "dark" | "blue";
const TONE: Record<Tone, string> = {
  green: "bg-mist text-forest-800",
  warm: "bg-[#FBEFD0] text-[#8A5A0B]",
  red: "bg-[#F6DED8] text-danger",
  grey: "bg-[#ECE7D6] text-[#4E5148]",
  dark: "bg-forest-800 text-cream",
  blue: "bg-[#E3ECF4] text-[#24476B]",
};

const STATUS_TONE: Record<string, Tone> = {
  Active: "green",
  Credited: "green",
  Approved: "green",
  "Approved (fee due)": "blue",
  "Fee paid": "green",
  Paid: "green",
  "Paid — Stripe": "green",
  "Matched to First Bank": "green",
  Pass: "green",
  Passed: "green",
  "Reminder sent": "warm",
  "Info requested": "warm",
  Suspense: "warm",
  "Matched — to confirm": "blue",
  "Receipt uploaded": "warm",
  "Awaiting Board": "warm",
  "Notice received": "grey",
  "Approved — paying": "blue",
  Scheduled: "grey",
  Pending: "warm",
  Refer: "warm",
  Submitted: "grey",
  "In review": "blue",
  Dormant: "grey",
  Supporter: "grey",
  "Awaiting first share": "blue",
  Withdrawn: "grey",
  Deceased: "grey",
  Returned: "grey",
  Suspended: "red",
  Refused: "red",
  Declined: "red",
  Rejected: "red",
  Fail: "red",
};

export function Pill({ children, tone }: { children: React.ReactNode; tone?: Tone }) {
  const t = tone ?? (typeof children === "string" ? STATUS_TONE[children] : undefined) ?? "grey";
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold whitespace-nowrap", TONE[t])}>{children}</span>;
}

/* ---------------- Buttons ---------------- */

type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "gold";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-forest-800 text-cream hover:bg-forest-900 border border-forest-800",
  outline: "border border-forest-800 bg-paper text-forest-800 hover:bg-mist",
  ghost: "border border-transparent bg-transparent text-forest-800 hover:bg-mist",
  danger: "border border-danger bg-paper text-danger hover:bg-[#F6DED8]",
  gold: "border border-gold-dark bg-[#FBEFD0] text-gold-ink hover:bg-[#F5E2A8]",
};

/**
 * A button that can be blocked with a stated reason. Blocked buttons stay focusable (aria-disabled),
 * show the reason as a tooltip, and repeat it in a toast if pressed, so keyboard users hear why.
 */
export function Btn({
  variant = "outline",
  size = "md",
  reason,
  className,
  onClick,
  children,
  type = "button",
  ...rest
}: { variant?: BtnVariant; size?: "sm" | "md"; reason?: string | false | null } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const toast = useToast();
  const blocked = Boolean(reason);
  return (
    <button
      type={type}
      aria-disabled={blocked || undefined}
      title={blocked ? (reason as string) : rest.title}
      onClick={(e) => {
        if (blocked) {
          e.preventDefault();
          toast(reason as string, "warn");
          return;
        }
        onClick?.(e);
      }}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "min-h-9 px-3 text-[13.5px]" : "min-h-11 px-4 text-[15px]",
        BTN[variant],
        blocked && "cursor-not-allowed opacity-45 hover:bg-inherit",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Form fields ---------------- */

export const inputCls =
  "h-11 min-w-0 rounded-[10px] border border-[#D9CFAE] bg-paper px-3 text-[15px] text-ink placeholder:text-[#8B8F86] focus:border-forest-800 focus:outline-none";

export function Field({ label, children, className, hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

/* ---------------- Tables ---------------- */

export function Table({ children, minWidth = 760, label }: { children: React.ReactNode; minWidth?: number; label?: string }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full border-collapse text-left text-[14.5px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, right, className }: { children?: React.ReactNode; right?: boolean; className?: string }) {
  return (
    <th scope="col" className={cx("border-b border-line px-2.5 pt-1 pb-3 text-[11.5px] font-semibold tracking-[0.06em] whitespace-nowrap text-muted uppercase", right && "text-right", className)}>
      {children}
    </th>
  );
}

export function Td({ children, right, className, colSpan }: { children?: React.ReactNode; right?: boolean; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cx("border-b border-line/80 px-2.5 py-3 align-middle", right && "text-right tabular-nums", className)}>
      {children}
    </td>
  );
}

/* ---------------- Banners and empty states ---------------- */

export function Banner({ tone = "info", children, title }: { tone?: "info" | "warn" | "lock" | "danger"; children: React.ReactNode; title?: string }) {
  const cls = {
    info: "border-[#CFE0D3] bg-mist text-forest-900",
    warn: "border-[#EBD38B] bg-[#FCF1D4] text-[#5C4508]",
    lock: "border-line bg-[#EFEADA] text-[#3E4239]",
    danger: "border-[#E9B9AD] bg-[#F9E7E2] text-danger",
  }[tone];
  return (
    <div className={cx("flex items-start gap-2.5 rounded-[14px] border px-4 py-3 text-[14px]", cls)} role={tone === "danger" ? "alert" : undefined}>
      {tone === "lock" ? <LockIcon size={18} className="mt-0.5 shrink-0" /> : null}
      <div className="min-w-0">
        {title ? <b className="font-semibold">{title} </b> : null}
        {children}
      </div>
    </div>
  );
}

export function ReadOnly({ why }: { why: string }) {
  return (
    <Banner tone="lock" title="Read-only.">
      {why}
    </Banner>
  );
}

export function NoAccess({ role, what }: { role: string; what: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EFEADA] text-forest-800">
        <LockIcon size={26} />
      </span>
      <h2 className="m-0 font-display text-[22px] font-bold text-forest-800">No access for this role</h2>
      <p className="m-0 max-w-md text-[15px] text-muted">
        {role} cannot open {what}. Access follows the roles table in the developer brief (p.9): staff see only what their role needs.
      </p>
    </Card>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-[14px] border border-dashed border-[#D9CFAE] px-6 py-10 text-center">
      <b className="text-[15px] font-semibold text-forest-800">{title}</b>
      {children ? <span className="max-w-md text-[14px] text-muted">{children}</span> : null}
    </div>
  );
}

export function KeyVals({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(110px,auto)_1fr] gap-x-4 gap-y-2 text-[14px]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="m-0 min-w-0 font-medium break-words text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------- Side panel ---------------- */

export function Drawer({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Close panel" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-forest-950/45" />
      <div
        ref={ref}
        tabIndex={-1}
        className={cx(
          "absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-admin-bg shadow-card outline-none",
          wide ? "sm:w-[min(92vw,820px)]" : "sm:w-[min(92vw,640px)]",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line bg-paper px-5 py-4 sm:px-6">
          <h2 id={titleId} className="m-0 min-w-0 truncate font-display text-[22px] font-bold text-forest-800">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-forest-800 hover:bg-mist">
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
