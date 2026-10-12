import { SAFEGUARDS } from "@/lib/content";
import { BankIcon, CheckIcon, LockIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";

const STEP_MS = 260;

/** Extra visual for a couple of the gates. */
function GateDetail({ index }: { index: number }) {
  if (index === 1) {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5 xl:justify-center">
        {["Home signer", "Diaspora signer"].map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2 py-0.5 text-[12px] font-bold text-forest-800">
            <CheckIcon size={12} /> {s}
          </span>
        ))}
      </div>
    );
  }
  if (index === 2) {
    const tiers = [
      { who: "Manager", cap: "up to ₦2m", w: "38%" },
      { who: "Chair + Treasurer", cap: "up to ₦20m", w: "68%" },
      { who: "Full board", cap: "above ₦20m", w: "100%" },
    ];
    return (
      <div className="mt-2 flex flex-col gap-1" aria-hidden="true">
        {tiers.map((t) => (
          <div key={t.who} className="relative h-6 overflow-hidden rounded-md bg-cream">
            <div className="absolute inset-y-0 left-0 rounded-md bg-forest-800/15" style={{ width: t.w }} />
            <div className="relative flex h-full items-center justify-between px-2 text-[11px] font-bold text-forest-800">
              <span>{t.who}</span>
              <span className="text-muted">{t.cap}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function SafeguardGates() {
  return (
    <Reveal className="gates relative overflow-hidden rounded-[28px] border border-line bg-paper p-6 shadow-card sm:p-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-forest-800 px-3.5 py-1.5 text-sm font-bold text-cream">
          <BankIcon size={16} className="text-gold" /> A payment request
        </span>
        <span className="text-sm text-muted">has to clear every gate before a naira moves</span>
      </div>

      <ol className="relative m-0 grid list-none gap-0 p-0 xl:grid-cols-6 xl:gap-4">
        {/* Track: vertical on smaller screens, horizontal on xl */}
        <span aria-hidden="true" className="absolute top-7 bottom-7 left-[27px] w-1 rounded-full bg-line xl:top-[26px] xl:right-[8%] xl:bottom-auto xl:left-[8%] xl:h-1 xl:w-auto" />
        <span aria-hidden="true" className="gate-track absolute top-7 bottom-7 left-[27px] w-1 origin-top rounded-full bg-forest-700 xl:top-[26px] xl:right-[8%] xl:bottom-auto xl:left-[8%] xl:h-1 xl:w-auto xl:origin-left" />

        {SAFEGUARDS.map((g, i) => (
          <li key={g.title} className="relative flex gap-4 pb-7 last:pb-0 xl:flex-col xl:items-center xl:gap-3 xl:pb-0 xl:text-center">
            <div className="relative h-14 w-14 shrink-0">
              {/* open state */}
              <span className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-dashed border-line-strong bg-paper text-line-strong">
                <LockIcon size={22} />
              </span>
              {/* cleared state */}
              <span
                className="gate-on absolute inset-0 flex items-center justify-center rounded-full bg-forest-800 text-gold shadow-[0_0_0_5px_rgb(201_162_39/0.25)]"
                style={{ transitionDelay: `${300 + i * STEP_MS}ms` }}
              >
                <CheckIcon size={24} />
              </span>
            </div>
            <div className="min-w-0 pt-1 xl:pt-0">
              <span className="text-[11px] font-extrabold tracking-[0.16em] text-gold-dark uppercase">Gate {i + 1}</span>
              <h3 className="m-0 mt-0.5 text-lg leading-tight font-bold text-forest-800">{g.title}</h3>
              <p className="m-0 mt-1 text-[15px] leading-snug text-muted">{g.text}</p>
              <div className="xl:text-left">
                <GateDetail index={i} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line-strong pt-5">
        <span className="text-[15px] text-muted">
          Every approval is recorded — who, what and when — and kept for at least 7 years.
        </span>
        <span className="gate-done inline-flex items-center gap-2 rounded-full bg-gold px-3.5 py-1.5 text-sm font-bold text-forest-900" style={{ transitionDelay: `${300 + SAFEGUARDS.length * STEP_MS}ms` }}>
          <CheckIcon size={16} /> Released to the business
        </span>
      </div>
    </Reveal>
  );
}
