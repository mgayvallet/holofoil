# Mettre Holofoil en ligne gratuitement

**GitHub** (code) → **Supabase** (comptes + base de données) → **Vercel** (site). Les trois sont gratuits.
Compte environ 20 minutes. Résultat : une adresse du type `https://holofoil-xxx.vercel.app`.

> En ligne, l'app utilise Supabase : la connexion se fait toujours par **pseudo + mot de passe**
> (Supabase gère un e-mail technique invisible derrière chaque pseudo). Le compte `demo` à pièces
> illimitées n'existe qu'en local.

---

## 1. Créer les comptes

- GitHub : <https://github.com/signup>
- Supabase : <https://supabase.com> → *Start your project* (connexion possible avec GitHub)
- Vercel : <https://vercel.com/signup> → offre **Hobby**, connexion **avec GitHub**

## 2. Envoyer le code sur GitHub

1. Sur GitHub : **New repository** → nom `holofoil` → **Private** → ne coche rien d'autre → *Create repository*.
2. Dans un terminal, dans le dossier `holofoil` (remplace `TON-PSEUDO-GITHUB`) :

```bash
git add -A
git commit -m "Holofoil : première version"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO-GITHUB/holofoil.git
git push -u origin main
```

`.env.local` et le dossier `.data/` (tes comptes et cartes locaux) ne sont **pas** envoyés : ils sont ignorés par git.

## 3. Préparer Supabase

1. **New project** → nom `holofoil`, région **West EU (Paris)**, choisis un mot de passe de base de données
   (garde-le, il ne sert pas à l'app) → *Create*.
2. **SQL Editor** → *New query* → colle tout le contenu de `supabase/migrations/0001_init.sql` → **Run**.
   Recommence avec `supabase/migrations/0002_friends.sql`. Les deux doivent afficher *Success*.
3. **Authentication → Sign In / Providers → Email** :
   - *Enable Email provider* : **activé**
   - *Confirm email* : **désactivé** (indispensable : les e-mails techniques ne reçoivent rien)
   - *Minimum password length* : 8 (conseillé)
4. **Project Settings → API Keys** : note ces trois valeurs (onglet *Legacy API keys* si besoin) :
   - **Project URL** (`https://xxxx.supabase.co`, dans *Project Settings → Data API*)
   - clé **anon / public** (ou *publishable*)
   - clé **service_role** (ou *secret*) — **à ne jamais partager ni publier**

## 4. Déployer sur Vercel

1. **Add New → Project** → importe le dépôt `holofoil` depuis GitHub.
2. *Framework Preset* : **Next.js** (détecté tout seul). Ne change pas les commandes de build.
3. **Environment Variables** : ajoute les trois variables :

| Nom | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon / publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role / secret |

4. **Deploy**. Au bout d'une à deux minutes, Vercel te donne l'adresse du site.

## 5. Finaliser

1. Supabase → **Authentication → URL Configuration** → *Site URL* : colle l'adresse Vercel.
2. Ouvre le site → **Créer un compte** → ouvre un booster.
   Le premier booster de chaque génération prend quelques secondes : l'app télécharge les cartes du set
   puis les garde en cache dans Supabase (table `tcg_cache`). Ensuite, c'est instantané.

## Mettre à jour le site

Après une modification du code :

```bash
git add -A
git commit -m "Ce qui a changé"
git push
```

Vercel redéploie automatiquement. Si une nouvelle migration apparaît dans `supabase/migrations/`,
exécute-la dans le SQL Editor de Supabase.

---

## Limites des offres gratuites

- **Supabase** : 500 Mo de base (largement assez). **Le projet se met en pause après 7 jours sans visite** :
  sur le tableau de bord Supabase, clique sur *Restore project* (tes données sont conservées).
- **Vercel Hobby** : usage **non commercial** uniquement — pas de publicité, pas de vente.
- Garde le site gratuit et partagé entre amis : les images et le nom Pokémon appartiennent à
  The Pokémon Company / Nintendo, qui peuvent demander le retrait d'un projet de fan.

## Sécurité

- La clé **service_role** donne tous les droits sur la base : uniquement dans les variables Vercel,
  jamais dans le code, jamais préfixée `NEXT_PUBLIC_`.
- Les joueurs n'ont qu'un accès en lecture (règles RLS) ; toutes les actions de jeu (tirage, ventes,
  échanges, amis) passent par le serveur et des fonctions SQL atomiques. Vérifiable avec `npm run test:sql`.
- Mots de passe gérés par Supabase Auth (hachés, limite de tentatives intégrée).

## Dépannage

| Symptôme | Solution |
| --- | --- |
| « Supabase demande une confirmation d'e-mail » | Étape 3.3 : désactive *Confirm email*. |
| « Supabase refuse l'e-mail technique » | Vercel → *Settings → Environment Variables* : ajoute `PSEUDO_EMAIL_DOMAIN` = `example.com`, puis *Redeploy*. |
| Erreur au chargement, `relation … does not exist` dans les logs | Les migrations SQL n'ont pas été exécutées (étape 3.2). |
| Le site ne répond plus après quelques jours | Projet Supabase en pause : *Restore project*. |
| Autre erreur | Vercel → ton projet → **Logs** : le message exact y figure. |
