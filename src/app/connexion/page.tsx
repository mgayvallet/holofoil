import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { DEMO_ACCOUNT, GAME, isSupabaseMode } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { ensureDemoAccount } from "@/lib/demo-account";
import { AccountForm } from "./AccountForm";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await getCurrentProfile()) redirect("/");
  await ensureDemoAccount();

  return (
    <div className="max-w-sm mx-auto py-10">
      <div className="text-center mb-8">
        <Logo className="w-16 h-16 mx-auto" />
        <h1 className="font-display font-bold text-3xl mt-4">Bienvenue, dresseur</h1>
        <p className="text-muted mt-1">Connecte-toi ou crée ton compte : {GAME.startingBoosters} boosters t&apos;attendent.</p>
      </div>

      <AccountForm demo={!isSupabaseMode() && process.env.NODE_ENV !== "production" ? DEMO_ACCOUNT : null} />
    </div>
  );
}
