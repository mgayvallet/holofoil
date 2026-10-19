/** Logo Holofoil : une carte bleue penchée avec une étincelle jaune (identité propre, rien d'officiel) */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="14" y="8" width="36" height="48" rx="7" fill="#16213e" transform="rotate(10 32 32)" />
      <rect x="12" y="6" width="36" height="48" rx="7" fill="#1f5fbf" stroke="#fff" strokeWidth="3" transform="rotate(-8 30 30)" />
      <path
        d="M30 14 L34.5 25.5 L46 30 L34.5 34.5 L30 46 L25.5 34.5 L14 30 L25.5 25.5 Z"
        fill="#ffcb05"
        stroke="#16213e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
