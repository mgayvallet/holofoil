// Succès / badges (partagé client + serveur)

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_booster", title: "Premier craquage", description: "Ouvrir ton premier booster", icon: "✨" },
  { id: "boosters_10", title: "Accro aux boosters", description: "Ouvrir 10 boosters", icon: "📦" },
  { id: "boosters_100", title: "Machine à déchirer", description: "Ouvrir 100 boosters", icon: "🌀" },
  { id: "first_double", title: "Double frappe", description: "Obtenir une Double rare (ex, V…)", icon: "⚡" },
  { id: "first_ultra", title: "Ultra !", description: "Obtenir une Ultra rare", icon: "💎" },
  { id: "first_illus", title: "Œil d'artiste", description: "Obtenir une Illustration rare", icon: "🎨" },
  { id: "first_special", title: "Chef-d'œuvre", description: "Obtenir une Illustration spéciale rare", icon: "🖼️" },
  { id: "first_hyper", title: "Or massif", description: "Obtenir une Hyper rare (ou carte secrète dorée)", icon: "👑" },
  { id: "set_half", title: "À mi-chemin", description: "Compléter un set à 50 %", icon: "🌗" },
  { id: "first_set", title: "Set complet !", description: "Compléter un set à 100 %", icon: "🏆" },
  { id: "unique_100", title: "Collectionneur", description: "Posséder 100 cartes différentes", icon: "📚" },
  { id: "unique_500", title: "Archiviste", description: "Posséder 500 cartes différentes", icon: "🏛️" },
  { id: "first_sale", title: "Marchand", description: "Vendre tes premiers doublons", icon: "🪙" },
  { id: "first_trade", title: "Esprit d'échange", description: "Réaliser un échange avec un joueur", icon: "🤝" },
  { id: "rich", title: "Bas de laine", description: "Avoir 5 000 pièces", icon: "💰" },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
