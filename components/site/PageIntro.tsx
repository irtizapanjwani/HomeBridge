/** Opening band for inner public pages. */
export function PageIntro({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="border-b border-line bg-cream">
      <div className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)] pt-12 pb-10 sm:pt-16 sm:pb-12">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="m-0 mt-3 max-w-[22em] text-[clamp(34px,5vw,54px)] leading-[1.08] text-forest-800">{title}</h1>
        {lead && <p className="m-0 mt-4 max-w-[44em] text-[17px] text-body">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
