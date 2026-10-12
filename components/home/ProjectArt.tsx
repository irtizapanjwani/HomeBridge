// Illustrated stand-ins until real project photos are available.
export function ProjectArt({ kind }: { kind: "food" | "health" | "solar" }) {
  const common = {
    viewBox: "0 0 400 180",
    preserveAspectRatio: "xMidYMid slice" as const,
    className: "h-full w-full transition duration-500 group-hover:scale-[1.04]",
    role: "img" as const,
  };

  if (kind === "food") {
    return (
      <svg {...common} aria-label="Illustration: cassava and plantain processing">
        <rect width="400" height="180" fill="#E9D9A6" />
        <circle cx="330" cy="46" r="26" fill="#F2C94C" />
        <path d="M0 130 Q100 100 200 125 T400 115 V180 H0z" fill="#B9A66A" />
        <path d="M0 150 Q120 130 240 150 T400 145 V180 H0z" fill="#8E7D45" />
        {/* plantain bunch */}
        <g transform="translate(70 62)">
          <path d="M20 0v70" stroke="#3C6B52" strokeWidth="5" />
          <path d="M20 10c-30-10-40 10-48 0 10 20 30 18 48 8z" fill="#4D8A62" />
          <path d="M20 22c30-12 40 8 48-2-8 22-30 20-48 10z" fill="#3C6B52" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${8 + i * 7} 40c-4 16 2 26 8 30`} stroke="#E0B43A" strokeWidth="7" strokeLinecap="round" fill="none" />
          ))}
        </g>
        {/* sacks */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${190 + i * 58} ${86 + (i % 2) * 6})`}>
            <path d="M6 0h40l6 54H0z" fill="#FFFDF6" stroke="#B8AC86" strokeWidth="2" />
            <path d="M10 0c4-8 28-8 32 0" fill="#F7F0DA" stroke="#B8AC86" strokeWidth="2" />
            <text x="26" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#17452F" fontFamily="sans-serif">
              {["GARRI", "FLOUR", "CASSAVA"][i]}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  if (kind === "health") {
    return (
      <svg {...common} aria-label="Illustration: pharmacy and small shops to let">
        <rect width="400" height="180" fill="#CFE0D3" />
        <rect x="0" y="150" width="400" height="30" fill="#9CB5A3" />
        {/* main building */}
        <rect x="120" y="40" width="160" height="112" fill="#FFFDF6" stroke="#17452F" strokeWidth="3" />
        <rect x="120" y="40" width="160" height="22" fill="#17452F" />
        <rect x="186" y="78" width="28" height="28" rx="4" fill="#3C6B52" />
        <path d="M200 84v16M192 92h16" stroke="#FFFDF6" strokeWidth="4" strokeLinecap="round" />
        <rect x="186" y="118" width="28" height="34" fill="#C9A227" />
        <rect x="134" y="80" width="36" height="26" fill="#E6EFE5" stroke="#17452F" strokeWidth="2" />
        <rect x="230" y="80" width="36" height="26" fill="#E6EFE5" stroke="#17452F" strokeWidth="2" />
        {/* side shops */}
        {[30, 296].map((x) => (
          <g key={x}>
            <rect x={x} y="88" width="76" height="64" fill="#F7F0DA" stroke="#3C6B52" strokeWidth="2" />
            <path d={`M${x - 4} 88h84l-8-14h-68z`} fill="#C9A227" />
            <rect x={x + 14} y="104" width="48" height="20" rx="3" fill="#FFFDF6" stroke="#3C6B52" strokeWidth="1.5" />
            <text x={x + 38} y="118" textAnchor="middle" fontSize="10" fontWeight="700" fill="#17452F" fontFamily="sans-serif">
              TO LET
            </text>
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg {...common} aria-label="Illustration: solar panels powering a small shop">
      <rect width="400" height="180" fill="#F6E7B0" />
      <g stroke="#E0B43A" strokeWidth="3" strokeLinecap="round">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const r = (n: number) => Math.round(n * 10) / 10;
          return <path key={i} d={`M${r(70 + Math.cos(a) * 34)} ${r(50 + Math.sin(a) * 34)}L${r(70 + Math.cos(a) * 46)} ${r(50 + Math.sin(a) * 46)}`} />;
        })}
      </g>
      <circle cx="70" cy="50" r="24" fill="#F2C94C" />
      <path d="M0 150h400v30H0z" fill="#C7B57A" />
      {/* shop */}
      <rect x="230" y="84" width="130" height="68" fill="#FFFDF6" stroke="#17452F" strokeWidth="3" />
      <path d="M222 84h146l-14-22H236z" fill="#17452F" />
      <rect x="250" y="102" width="40" height="30" fill="#FBEFD0" stroke="#17452F" strokeWidth="2" />
      <circle cx="270" cy="117" r="6" fill="#F2C94C" />
      <rect x="306" y="104" width="34" height="48" fill="#C9A227" />
      {/* panels */}
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${70 + i * 76} 92) skewX(-18)`}>
          <rect width="64" height="40" fill="#22573D" stroke="#0E2C1E" strokeWidth="2" />
          <path d="M16 0v40M32 0v40M48 0v40M0 13h64M0 27h64" stroke="#8FB59D" strokeWidth="1" />
        </g>
      ))}
      <path d="M90 132v18M166 132v18" stroke="#0E2C1E" strokeWidth="3" />
      <path d="M196 120 C 210 120, 214 110, 230 110" stroke="#C9A227" strokeWidth="3" fill="none" strokeDasharray="4 4" />
    </svg>
  );
}
