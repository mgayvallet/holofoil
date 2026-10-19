/**
 * Référence les visuels de boosters déposés dans public/boosters/<setId>.<webp|png|jpg|avif>
 * et écrit src/lib/booster/pack-art.json. Lancé automatiquement avant `dev` et `build`.
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "boosters");
const out = path.join(process.cwd(), "src", "lib", "booster", "pack-art.json");
const map = {};
if (fs.existsSync(dir)) {
  for (const file of fs.readdirSync(dir).sort()) {
    const m = file.match(/^(.+)\.(webp|png|jpe?g|avif)$/i);
    if (m) map[m[1]] = `/boosters/${file}`;
  }
}
fs.writeFileSync(out, JSON.stringify(map, null, 2) + "\n");
console.log(`[pack-art] ${Object.keys(map).length} visuel(s) de booster référencé(s)`);
