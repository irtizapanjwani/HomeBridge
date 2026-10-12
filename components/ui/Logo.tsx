export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" className="shrink-0">
      <rect width="44" height="44" rx="10" fill="#17452F" />
      <path d="M7 30c5-9 25-9 30 0" fill="none" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 23v-6l7-5 7 5v6" fill="none" stroke="#F7F0DA" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M7 34h30" stroke="#F7F0DA" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
