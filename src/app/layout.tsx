import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/config";
import { getCurrentProfile } from "@/lib/auth";
import { availableBoosters } from "@/lib/game/timer";
import { pendingFriendRequests } from "@/lib/game/service";
import { AppHeader } from "@/components/AppHeader";
import { MobileNav, SideNav } from "@/components/Navigation";
import { LegalFooter } from "@/components/LegalFooter";
import { ServiceWorker } from "@/components/ServiceWorker";
import { ToastProvider } from "@/components/Toasts";

// Polices arrondies et très lisibles
const body = Nunito({ variable: "--font-body", subsets: ["latin"], weight: ["400", "600", "700", "800", "900"] });
const display = Fredoka({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Ouvre des boosters Pokémon`, template: `%s · ${APP_NAME}` },
  description:
    "Ouvre gratuitement un booster toutes les 10 minutes, collectionne les vraies cartes du JCC Pokémon, complète tes sets et échange avec les autres dresseurs.",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d02c0c" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1526" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const profile = await getCurrentProfile();
  const boosters = profile ? availableBoosters(profile.boosterAnchor) + profile.bonusBoosters : 0;
  const friendRequests = profile ? await pendingFriendRequests(profile.id) : 0;

  return (
    <html lang="fr" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#contenu"
          className="sr-only-focusable fixed left-3 top-3 z-[200] rounded-xl bg-volt text-ink px-4 py-3 font-bold"
        >
          Aller au contenu
        </a>
        <ToastProvider>
          {profile && <SideNav boosters={boosters} friendRequests={friendRequests} />}
          <div className={`min-h-dvh flex flex-col ${profile ? "lg:pl-64" : ""}`}>
            <AppHeader />
            <main id="contenu" className="flex-1 w-full max-w-5xl mx-auto px-4 pt-5 pb-6">
              {children}
            </main>
            <LegalFooter />
          </div>
          {profile && <MobileNav boosters={boosters} friendRequests={friendRequests} />}
        </ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
