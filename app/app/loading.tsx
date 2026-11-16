/**
 * Shown the instant a member-area tab is clicked, while that page's data arrives: the page's shape
 * in soft placeholders, so the click answers straight away instead of the old page just sitting there.
 */
export default function Loading() {
  const bar = "animate-pulse rounded-full bg-line/70";
  const card = "rounded-[22px] border border-line bg-paper p-[clamp(18px,3vw,28px)]";
  return (
    <div
      className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,28px)] pt-[clamp(20px,3vw,32px)]"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className={`${bar} h-3 w-28`} />
      <div className={`${bar} mt-3 h-10 w-[min(520px,80%)]`} />
      <div className={`${bar} mt-4 h-4 w-[min(640px,92%)]`} />

      <div className="relative mt-6 h-[150px] overflow-hidden rounded-[22px] bg-forest-800">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-gold-soft to-transparent" />
        <div className="grid h-full grid-cols-2 gap-6 p-7 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={i > 1 ? "hidden lg:block" : ""}>
              <div className="h-3 w-24 animate-pulse rounded-full bg-cream/15" />
              <div className="mt-3 h-8 w-32 animate-pulse rounded-full bg-cream/20" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className={card}>
          <div className={`${bar} h-5 w-40`} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mt-5 flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-mist" />
              <div className="flex-1">
                <div className={`${bar} h-4 w-[60%]`} />
                <div className={`${bar} mt-2 h-3 w-[40%]`} />
              </div>
            </div>
          ))}
        </div>
        <div className={card}>
          <div className={`${bar} h-5 w-36`} />
          <div className={`${bar} mt-5 h-11 w-full`} />
          <div className={`${bar} mt-3 h-11 w-full`} />
          <div className={`${bar} mt-3 h-11 w-2/3`} />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
