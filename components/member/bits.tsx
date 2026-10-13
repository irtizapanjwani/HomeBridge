/** Small shared pieces for the member area. */

export function SamplePill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-sand/60 px-2.5 py-0.5 text-[12px] font-semibold tracking-wide text-gold-ink ${className}`}
    >
      Sample data
    </span>
  );
}

export function Card({
  as: Tag = "section",
  className = "",
  children,
  ...rest
}: { as?: "section" | "div" | "aside"; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`rounded-[22px] border border-line bg-paper p-[clamp(18px,3vw,28px)] ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest-800 px-6 py-2.5 text-[15px] font-semibold text-cream no-underline transition-colors hover:bg-forest-900 hover:text-cream disabled:cursor-not-allowed disabled:bg-line disabled:text-muted";
export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-forest-800 bg-transparent px-6 py-2.5 text-[15px] font-semibold text-forest-800 no-underline transition-colors hover:bg-mist hover:text-forest-900 disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent";
export const textLink =
  "inline-flex min-h-11 items-center bg-transparent p-0 text-[15px] font-semibold text-forest-800 underline underline-offset-[3px] hover:text-forest-900";
