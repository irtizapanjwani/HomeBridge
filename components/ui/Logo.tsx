/** HomeBridge mark: a home on a bridge over water, with members either side. */
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" className="shrink-0">
      <rect width="44" height="44" rx="10" fill="#17452F" />
      {/* house */}
      <path d="M22 8.5 31 16.5v8.5H13v-8.5z" fill="#C9A227" />
      <path d="M19 25v-3.2a3 3 0 0 1 6 0V25z" fill="#17452F" />
      {/* members */}
      <circle cx="9.6" cy="19.2" r="1.7" fill="#F7F0DA" />
      <rect x="8.1" y="21.2" width="3" height="3.8" rx="1.3" fill="#F7F0DA" />
      <circle cx="34.4" cy="19.2" r="1.7" fill="#F7F0DA" />
      <rect x="32.9" y="21.2" width="3" height="3.8" rx="1.3" fill="#F7F0DA" />
      {/* bridge deck and water */}
      <rect x="6" y="25.6" width="32" height="2.2" rx="1.1" fill="#C9A227" />
      <path d="M11 33.5c2.2-1.6 4.4-1.6 6.6 0s4.4 1.6 6.6 0 4.4-1.6 6.6 0" fill="none" stroke="#F7F0DA" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Mark plus "HomeBridge / COOPERATIVE" wordmark, as in the redesign. */
export function Logo({ size = 44, sub = "Cooperative", tone = "light" }: { size?: number; sub?: string | null; tone?: "light" | "dark" }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <LogoMark size={size} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`font-display text-[clamp(20px,2vw,24px)] font-bold ${tone === "dark" ? "text-cream" : "text-forest-800"}`}>
          Home<span className="text-gold">Bridge</span>
        </span>
        {sub && (
          <span className={`mt-1 truncate text-[10.5px] font-semibold tracking-[0.28em] uppercase ${tone === "dark" ? "text-on-dark" : "text-forest-800"}`}>
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}
