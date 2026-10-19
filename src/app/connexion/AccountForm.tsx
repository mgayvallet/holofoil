"use client";
import { useActionState, useState } from "react";
import { accountAction, type AuthState } from "@/app/actions";

const input = "mt-1 w-full rounded-2xl bg-surface-2 border border-line px-4 min-h-12 font-semibold";

/** Connexion / création de compte (pseudo + mot de passe) du mode local */
export function AccountForm({ demo }: { demo: { username: string; password: string } | null }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [state, action, pending] = useActionState<AuthState, FormData>(accountAction, {});
  const [show, setShow] = useState(false);

  return (
    <div className="glass rounded-3xl p-5 space-y-4">
      <div role="tablist" aria-label="Type de connexion" className="grid grid-cols-2 rounded-2xl bg-surface-2 p-1 font-bold">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`press rounded-xl min-h-11 ${mode === m ? "bg-surface text-text shadow" : "text-muted"}`}
          >
            {m === "login" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      <form action={action} className="space-y-3" key={mode}>
        <input type="hidden" name="mode" value={mode} />
        <label className="block">
          <span className="text-sm font-bold">Nom d&apos;utilisateur</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={input}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Mot de passe</span>
          <div className="relative">
            <input
              name="password"
              type={show ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={`${input} pr-24`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 rounded-xl px-3 min-h-9 text-sm font-bold text-cyan"
              aria-pressed={show}
            >
              {show ? "Masquer" : "Afficher"}
            </button>
          </div>
        </label>
        {mode === "register" && (
          <>
            <label className="block">
              <span className="text-sm font-bold">Confirmer le mot de passe</span>
              <input
                name="confirm"
                type={show ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className={input}
              />
            </label>
            <p className="text-xs text-muted">8 caractères minimum. Ton mot de passe est chiffré (haché) et jamais stocké en clair.</p>
          </>
        )}

        {state.error && (
          <p role="alert" className="text-sm font-bold text-bad">
            {state.error}
          </p>
        )}

        <button disabled={pending} className="press w-full rounded-2xl bg-brand min-h-12 font-display font-bold text-lg disabled:opacity-60">
          {pending ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      {demo && (
        <div className="rounded-2xl bg-surface-2 p-3 text-sm space-y-1">
          <p className="font-bold">Compte de démo (développement uniquement)</p>
          <p>
            Nom d&apos;utilisateur : <code className="font-bold">{demo.username}</code>
            <br />
            Mot de passe : <code className="font-bold">{demo.password}</code>
          </p>
        </div>
      )}
    </div>
  );
}
