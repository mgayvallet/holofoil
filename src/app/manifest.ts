import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Holofoil — Boosters Pokémon",
    short_name: "Holofoil",
    description: "Ouvre un booster gratuit toutes les 10 minutes et complète tes sets.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef3fb",
    theme_color: "#d02c0c",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
