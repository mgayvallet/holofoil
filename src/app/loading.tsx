/**
 * Affiché instantanément pendant le chargement d'une page (navigation) :
 * le menu et l'en-tête restent en place, seul le contenu montre un squelette.
 */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="space-y-2">
        <div className="skeleton h-9 w-56 rounded-2xl" />
        <div className="skeleton h-4 w-80 max-w-full rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="skeleton h-64 rounded-[28px]" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-24 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
