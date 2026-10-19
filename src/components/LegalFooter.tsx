export function LegalFooter() {
  return (
    <footer className="w-full max-w-5xl mx-auto px-4 pb-32 lg:pb-8 pt-6 text-[13px] leading-relaxed text-muted text-center">
      <p>
        Projet de fan non officiel. Pokémon et les noms associés sont des marques de Nintendo, The Pokémon Company,
        Creatures et GAME FREAK. Ce site n&apos;est pas affilié à ces sociétés.
      </p>
      <p className="mt-1">
        Aucun achat en argent réel : la monnaie du jeu est uniquement virtuelle et non convertible. Données et images
        des cartes :{" "}
        <a className="underline font-bold" href="https://tcgdex.dev" target="_blank" rel="noreferrer">
          TCGdex
        </a>
        .
      </p>
    </footer>
  );
}
