export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  id?: string;
}) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-2.5 mb-3 font-display text-[clamp(30px,4.2vw,46px)] font-extrabold tracking-[-0.015em] text-forest-800">
        {title}
      </h2>
      {lead && <p className="m-0 mb-8 max-w-[42em] text-muted">{lead}</p>}
    </>
  );
}
