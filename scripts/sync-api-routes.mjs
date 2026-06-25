/**
 * Synchronise tooling/api-routes.snapshot.json depuis CarAgency routes/api.php
 * Usage : npm run sync:api
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const OPTIONAL_PUBLIC = [
  { method: 'POST', path: '/cars/check-availability' },
  { method: 'POST', path: '/external-sites/register' },
  { method: 'GET', path: '/cars/{registration_number}/external-sites' },
];

function findCarAgencyApiPhp() {
  const candidates = [
    path.join(root, '..', '..', 'Cars', 'CarAgency', 'routes', 'api.php'),
    path.join(root, '..', 'CarAgency', 'routes', 'api.php'),
    process.env.CAR_AGENCY_PATH
      ? path.join(process.env.CAR_AGENCY_PATH, 'routes', 'api.php')
      : null,
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function joinPaths(base, segment) {
  const b = base.replace(/\/$/, '');
  const s = segment.startsWith('/') ? segment : `/${segment}`;
  return `${b}${s}`.replace(/\/+/g, '/') || '/';
}

function parseRoutes(apiPhp) {
  const routes = [];
  const prefixStack = [''];

  for (const rawLine of apiPhp.split('\n')) {
    const line = rawLine.trim();

    const prefixMatches = [...line.matchAll(/prefix\s*\(\s*['"]([^'"]+)['"]\s*\)/g)];
    for (const m of prefixMatches) {
      prefixStack.push(joinPaths(prefixStack[prefixStack.length - 1], m[1]));
    }

    const routeMatch = line.match(/Route::(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/i);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();
      const full = joinPaths(prefixStack[prefixStack.length - 1], routeMatch[2]);
      routes.push({ method, path: full });
    }

    if (/^\}\);\s*$/.test(line) && prefixStack.length > 1) {
      prefixStack.pop();
    }
  }

  const seen = new Set();
  return routes.filter((r) => {
    const k = `${r.method} ${r.path}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function main() {
  const apiPath = findCarAgencyApiPhp();
  if (!apiPath) {
    console.error('✗ CarAgency routes/api.php introuvable. Définissez CAR_AGENCY_PATH.');
    process.exit(1);
  }

  const apiPhp = fs.readFileSync(apiPath, 'utf8');
  const routes = parseRoutes(apiPhp);
  const snapPath = path.join(root, 'tooling', 'api-routes.snapshot.json');

  const out = {
    $schema:
      'ToubCar — routes HTTP sous préfixe /api (Laravel CarAgency routes/api.php). Mettre à jour via npm run sync:api.',
    routes,
    optionalPublicIntegrations: OPTIONAL_PUBLIC,
  };

  fs.writeFileSync(snapPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`✓ Snapshot mis à jour : ${routes.length} routes depuis ${apiPath}`);
}

main();
