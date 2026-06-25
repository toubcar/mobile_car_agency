/**
 * Vérifie que chaque route du snapshot CarAgency apparaît dans le code mobile (services + app).
 * Usage : npm run check:api
 * Mise à jour snapshot : éditer tooling/api-routes.snapshot.json quand routes/api.php change.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function collectSources() {
  const dirs = [path.join(root, 'services'), path.join(root, 'app')];
  let body = '';
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const name of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, name.name);
      if (name.isDirectory()) {
        if (name.name === 'node_modules' || name.name === '.expo') continue;
        walk(p);
      } else if (/\.(tsx?|jsx?)$/.test(name.name)) {
        body += fs.readFileSync(p, 'utf8') + '\n';
      }
    }
  }
  for (const d of dirs) walk(d);
  return body;
}

/** Préfixe stable pour matcher les chemins avec paramètres dynamiques */
function coveragePrefix(routePath) {
  const i = routePath.indexOf('{');
  if (i === -1) return routePath;
  const prefix = routePath.slice(0, i).replace(/\/+$/, '');
  return prefix.length ? prefix : routePath;
}

/** CRUD admin|agence cars : le mobile utilise `/${scope}/cars` (cars.service.ts). */
function coversAdminAgenceCars(source, routePath) {
  if (!/^\/(admin|agence)\/cars/.test(routePath)) return false;
  return source.includes('/${scope}/cars');
}

function main() {
  const snapPath = path.join(root, 'tooling', 'api-routes.snapshot.json');
  const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  const optionalPaths = new Set((snap.optionalPublicIntegrations ?? []).map((o) => o.path));

  const source = collectSources();
  const routes = snap.routes;

  const missing = [];
  const optionalMissing = [];

  for (const r of routes) {
    const p = r.path;
    if (optionalPaths.has(p)) continue;

    if (coversAdminAgenceCars(source, p)) continue;

    const needle = coveragePrefix(p);

    const hit =
      source.includes(`'${needle}`) ||
      source.includes(`"${needle}`) ||
      source.includes(`'${p}'`) ||
      source.includes(`"${p}"`) ||
      (needle.length > 6 && source.includes(needle));

    if (!hit) missing.push(`${r.method} ${p}`);
  }

  for (const o of snap.optionalPublicIntegrations ?? []) {
    const p = o.path;
    const needle = coveragePrefix(p);
    const hit =
      coversAdminAgenceCars(source, p) ||
      source.includes(`'${needle}`) ||
      source.includes(`"${needle}`) ||
      source.includes(`'${p}'`) ||
      source.includes(`"${p}"`) ||
      (needle.length > 6 && source.includes(needle));
    if (!hit) optionalMissing.push(`${o.path} — ${o.note ?? 'optionnel'}`);
  }

  if (optionalMissing.length) {
    console.warn('\n⚠ Intégrations publiques optionnelles non référencées dans le code :');
    optionalMissing.forEach((l) => console.warn('  -', l));
  }

  if (missing.length) {
    console.error('\n✗ Routes API sans occurrence détectée dans services/ ou app/ :');
    missing.forEach((l) => console.error('  -', l));
    console.error('\nAjoutez un appel apiClient ou mettez à jour tooling/api-routes.snapshot.json.\n');
    process.exit(1);
  }

  console.log(`✓ Couverture API : ${routes.length} routes du snapshot trouvées dans le code mobile.`);
}

main();
