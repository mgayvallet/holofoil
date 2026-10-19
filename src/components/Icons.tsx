// Icônes d'interface (traits, 24×24). Décoratives : le libellé texte est toujours affiché à côté.
import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IconPack = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 3h12l-1 3 1 3v12H6V9l1-3-1-3Z" />
    <path d="M6 9h12M12 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4Z" />
  </svg>
);
export const IconBinder = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 3v18M11 8h6M11 12h6" />
  </svg>
);
export const IconShop = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);
export const IconTrade = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);
export const IconTrophy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M16 6h3a3 3 0 0 1-3 4M8 6H5a3 3 0 0 0 3 4M12 13v4M8 20h8M9.5 17h5" />
  </svg>
);
export const IconUser = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const IconBack = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const IconFriends = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
  </svg>
);
