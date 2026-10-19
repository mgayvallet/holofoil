/** Pièce du jeu (décorative : le montant est toujours écrit à côté) */
export function Coin({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`inline-block shrink-0 ${className}`} aria-hidden>
      <circle cx="10" cy="10" r="9" fill="#ffcb05" stroke="#b8860b" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="5.5" fill="none" stroke="#b8860b" strokeWidth="1.4" />
    </svg>
  );
}
