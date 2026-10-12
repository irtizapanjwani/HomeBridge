import { MEMBER_TYPES } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";

type Theme = (typeof MEMBER_TYPES)[number]["theme"];

const THEMES: Record<Theme, { card: string; muted: string; fee: string; chip: string; tag: string }> = {
  forest: {
    card: "bg-[linear-gradient(135deg,#22573D_0%,#17452F_55%,#0E2C1E_100%)] text-cream",
    muted: "text-on-dark",
    fee: "text-gold",
    chip: "#C9A227",
    tag: "bg-cream/10 text-cream",
  },
  paper: {
    card: "bg-[linear-gradient(135deg,#FFFFFF_0%,#FFFDF6_50%,#F3EBD2_100%)] text-ink ring-1 ring-line",
    muted: "text-muted",
    fee: "text-forest-800",
    chip: "#C9A227",
    tag: "bg-forest-100 text-forest-800",
  },
  gold: {
    card: "foil bg-[linear-gradient(125deg,#B88A12_0%,#E9CB6B_30%,#C9A227_52%,#F2DC8E_72%,#A87D0C_100%)] text-forest-950",
    muted: "text-forest-900/80",
    fee: "text-forest-950",
    chip: "#0E2C1E",
    tag: "bg-forest-950/10 text-forest-950",
  },
  clay: {
    card: "bg-[linear-gradient(135deg,#9A4A2C_0%,#7A2E1F_60%,#5E2216_100%)] text-cream",
    muted: "text-[#F1D9CC]",
    fee: "text-[#FFE3A1]",
    chip: "#E3C565",
    tag: "bg-cream/10 text-cream",
  },
  ink: {
    card: "bg-[linear-gradient(135deg,#2A3A31_0%,#1B2620_60%,#111915_100%)] text-cream",
    muted: "text-[#C8CFC9]",
    fee: "text-gold-soft",
    chip: "#C9A227",
    tag: "bg-cream/10 text-cream",
  },
};

// A slight fan on wide screens; cards straighten on hover.
const FAN = ["lg:-rotate-3 lg:translate-y-3", "lg:-rotate-1", "lg:rotate-0 lg:-translate-y-3", "lg:rotate-1", "lg:rotate-3 lg:translate-y-3"];

function Chip({ color }: { color: string }) {
  return (
    <svg width="38" height="30" viewBox="0 0 38 30" aria-hidden="true">
      <rect x="1" y="1" width="36" height="28" rx="6" fill={color} opacity=".9" />
      <path d="M1 10h11M1 20h11M26 10h11M26 20h11M12 1v28M26 1v28M12 15h14" stroke="rgba(0,0,0,.28)" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function MemberCards() {
  return (
    <Reveal>
      <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3 lg:px-2 lg:pt-4 lg:pb-6">
        {MEMBER_TYPES.map((m, i) => {
          const t = THEMES[m.theme];
          return (
            <li
              key={m.name}
              className={`group relative transition duration-300 hover:z-10 lg:hover:-translate-y-4 lg:hover:rotate-0 ${FAN[i]}`}
            >
              <article
                className={`relative flex h-full min-h-[230px] flex-col sm:min-h-[300px] gap-3 overflow-hidden rounded-[20px] p-5 shadow-[0_14px_30px_-12px_rgb(14_44_30/0.45)] transition-shadow group-hover:shadow-[0_24px_44px_-14px_rgb(14_44_30/0.55)] ${t.card}`}
              >
                {/* card face decoration */}
                <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-14 -bottom-16 h-52 w-52 opacity-[0.13]">
                  <path d="M20 150c30-60 130-60 160 0" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
                  <path d="M60 110V80l40-28 40 28v30" fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
                </svg>

                <div className="flex items-center justify-between">
                  <Chip color={t.chip} />
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.14em] uppercase ${t.tag}`}>{m.tag}</span>
                </div>

                <div>
                  <h3 className="m-0 font-display text-[19px] leading-tight font-extrabold">{m.name}</h3>
                  <p className={`m-0 mt-1 text-sm leading-snug ${t.muted}`}>{m.who}</p>
                </div>

                <div className="mt-auto">
                  <div className={`font-display text-[clamp(24px,2.3vw,30px)] leading-none font-extrabold ${t.fee}`}>{m.fee}</div>
                  <p className={`m-0 mt-1 text-[13px] leading-snug ${t.muted}`}>{m.feeNote}</p>
                </div>

                <div className={`flex items-center justify-between gap-2 border-t pt-2.5 text-[13px] font-semibold ${m.theme === "paper" ? "border-line" : "border-current/20"}`}>
                  <span>{m.perk}</span>
                  <span className="shrink-0 font-mono text-[11px] tracking-widest whitespace-nowrap opacity-60" aria-hidden="true">
                    HB-{String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {m.theme === "gold" && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-lg bg-forest-900 px-3 py-0.5 text-[10px] font-extrabold tracking-[0.16em] text-gold uppercase">
                    Limited
                  </span>
                )}
              </article>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 mb-0 text-center text-sm text-muted">
        Every card buys shares at the same <b className="text-forest-800">₦1,000</b> and carries the same{" "}
        <b className="text-forest-800">one vote</b>.
      </p>
    </Reveal>
  );
}
