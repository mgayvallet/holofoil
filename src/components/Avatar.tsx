/** Avatar d'un joueur : photo (compte Google…) ou initiale */
export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full bg-cyan text-white grid place-items-center font-display font-bold overflow-hidden"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
