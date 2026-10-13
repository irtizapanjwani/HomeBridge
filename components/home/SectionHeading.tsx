export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  id?: string;
  as?: "h2" | "h3";
}) {
  return (
    <>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Tag id={id} className={`mt-3 ${lead ? "mb-3" : "mb-8"} font-display text-[clamp(28px,3.8vw,42px)] leading-[1.12] font-bold text-forest-800`}>
        {title}
      </Tag>
      {lead && <p className="m-0 mb-8 max-w-[44em] text-[16.5px] text-body">{lead}</p>}
    </>
  );
}
