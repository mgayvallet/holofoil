# Holofoil

Web app (PWA, mobile-first, en français) de collection de cartes Pokémon : un booster gratuit toutes les
10 minutes, avec les **vraies cartes, images et raretés** de **toutes les générations** du JCC Pokémon, du Set de Base
(1999) à aujourd'hui, plus Pokémon TCG Pocket : environ 208 sets et 23 000 cartes (données [TCGdex](https://tcgdex.dev),
images manquantes complétées par [pokemontcg.io](https://pokemontcg.io)).

> Projet de fan non officiel. Pokémon et les noms associés sont des marques de Nintendo, The Pokémon Company,
> Creatures et GAME FREAK. Ce site n'est pas affilié à ces sociétés. Aucun achat en argent réel : la monnaie
> est uniquement virtuelle et non convertible.

## Démarrer

```bash
npm install
npm run dev
```

Sans Supabase, l'app tourne en **mode local** (données JSON dans `.data/`) avec de vrais comptes
**nom d'utilisateur + mot de passe** (création de compte et connexion sur `/connexion`).

### Compte de démo

`npm run dev` crée automatiquement un compte de démo, avec **pièces illimitées** (boosters bonus gratuits) et 10 boosters bonus offerts :

| Nom d'utilisateur | Mot de passe |
| --- | --- |
| `demo` | `pokemon-demo` |

Modifiables via `DEMO_USERNAME` / `DEMO_PASSWORD`. Le compte de démo n'est créé qu'en développement.

### Sécurité des comptes

- Mots de passe hachés avec **scrypt** et un sel aléatoire, jamais stockés en clair ; comparaison à temps constant.
- **Limite de tentatives** : 8 essais / 15 min par compte, 30 par adresse IP.
- Message d'erreur identique que le compte existe ou non (pas d'énumération des pseudos).
- Session dans un cookie **httpOnly signé HMAC-SHA256** (`secure` en production), valable 30 jours.
- En production, `SESSION_SECRET` (32 caractères min.) est obligatoire.

### En ligne (Supabase + Vercel, gratuit)

Voir **[DEPLOIEMENT.md](DEPLOIEMENT.md)** : guide pas à pas (GitHub → Supabase → Vercel).
En mode Supabase, la connexion reste « pseudo + mot de passe » (Supabase Auth, avec un e-mail technique
invisible derrière chaque pseudo). Le schéma SQL (tables, RLS, fonctions atomiques) se vérifie avec :

```bash
npm run test:sql
```

## Architecture

| Dossier | Rôle |
| --- | --- |
| `src/lib/tcgdex/` | Appels TCGdex + cache serveur 2 niveaux (mémoire + table `tcg_cache` ou fichiers). Les sets sont "snapshotés" (toutes les cartes avec rareté/types/variantes) une fois, puis servis 7 jours. Images FR, repli EN si absente. |
| `src/lib/booster/eras/` | **Un fichier de config par ère** : Wizards (1999-2003, 11 cartes), e-Card/EX (9), Diamant & Perle/HGSS, Noir & Blanc/XY, Soleil et Lune, Épée et Bouclier, Écarlate et Violet/Méga (10), Pocket (5) et collections spéciales (promos, McDonald's, kits : 5 cartes pondérées). Slots, taux, ajustements par set (`setRates`). |
| `src/lib/tcgdex/ids.ts` | Sous-sets fusionnés dans leur parent (Galeries de Dresseurs, Galerie Galaroise, Coffres Étincelants…) et résolution des images : TCGdex FR → TCGdex EN → pokemontcg.io → carte générée (`/carte-image/<id>`). |
| `src/lib/booster/draw.ts` | Tirage : slots → upgrades probabilistes → repli. Les paliers présents dans un set mais non couverts deviennent tirables (≈1/40) pour que tout set soit complétable. |
| `src/lib/booster/rarity.ts` | Libellés de rareté TCGdex → paliers (tri, prix de revente, effets visuels). |
| `src/lib/game/` | Timer de boosters (ancre temporelle, sans cron), **un booster par catégorie** (`categories.ts` : une génération = un booster, qui tire l'un de ses sets pondéré par le nombre de cartes puis applique ses vraies règles), succès, services (ouverture, vente, classement). |
| `src/lib/store/` | Persistance : `supabase.ts` (RPC atomiques) ou `local.ts` (mode démo). |
| `src/components/opening/` | Expérience d'ouverture : déchirure au swipe, révélation carte par carte, effets par rareté, récap. |
| `supabase/migrations/` | Schéma, RLS (lecture seule côté client), fonctions `commit_opening`, `sell_cards`, `buy_bonus_booster`, `respond_trade`. |

**Anti-triche** : le tirage (RNG crypto) et toutes les mutations se font côté serveur (Server Actions). En mode
Supabase, les tables sont en lecture seule pour les clients ; seules les fonctions SQL appelées avec la clé
`service_role` modifient les données, de façon atomique (verrous de ligne).

## Visuels de boosters

TCGdex ne fournit pas les visuels d'emballage. Par défaut, chaque set a une enveloppe générée (couleurs propres + logo du set).
Pour utiliser vos propres visuels, déposez `public/boosters/<categorie>.webp` (ou .png/.jpg/.avif, ex. `sv.webp`, `base.png`) ; ils sont
référencés automatiquement au lancement (`npm run dev` / `npm run build`). Voir `public/boosters/LISEZMOI.txt`.
Les visuels officiels appartiennent à The Pokémon Company : n'utilisez que des images que vous avez le droit d'utiliser.

## Équilibrage

- `src/lib/config.ts` : intervalle (10 min), stock max (15), boosters de départ, pièces, prix du booster bonus.
- `src/lib/booster/eras/*.ts` : composition et taux des boosters.
- `src/lib/booster/rarity.ts` : prix de revente par rareté.

Vérifier les taux sur un vrai set :

```bash
npx tsx scripts/simulate.mts sv01 20000
```

Vérifier des sets de toutes les générations (images, taille et taux des boosters) :

```bash
HOLOFOIL_DATA_DIR=/tmp/hf-test node --conditions=react-server --import tsx scripts/check-eras.mts base1 ex1 dp1 swsh9 A1
```

Tester la logique de jeu (ouverture, limite, achat, vente, échange, succès, classement) :

```bash
HOLOFOIL_DATA_DIR=/tmp/hf-test node --conditions=react-server --import tsx scripts/test-flow.mts
```
