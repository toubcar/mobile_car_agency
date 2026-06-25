/**
 * Smoke test API CarAgency (nécessite php artisan serve actif).
 * Usage : npm run test:e2e-api
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const base = (env.EXPO_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
  const api = `${base}/api`;

  const checks = [
    { name: 'GET /cars (public)', url: `${api}/cars`, expect: (s) => s === 200 },
    { name: 'GET /cars/featured', url: `${api}/cars/featured`, expect: (s) => s === 200 },
    {
      name: 'POST /auth/login admin',
      url: `${api}/auth/login`,
      method: 'POST',
      body: { email: 'admin@toubcar.test', password: 'ToubcarAdmin2026!' },
      expect: (s) => s === 200,
      token: true,
    },
  ];

  let token = null;
  let failed = 0;

  for (const c of checks) {
    try {
      const res = await fetch(c.url, {
        method: c.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: c.body ? JSON.stringify(c.body) : undefined,
      });
      const ok = c.expect(res.status);
      if (!ok) {
        console.error(`✗ ${c.name} — HTTP ${res.status}`);
        failed++;
        continue;
      }
      if (c.token) {
        const json = await res.json();
        token = json.token ?? json.data?.token;
      }
      console.log(`✓ ${c.name}`);
    } catch (e) {
      console.error(`✗ ${c.name} — ${e.message}`);
      failed++;
    }
  }

  if (token) {
    const authChecks = [
      { name: 'GET /profile', url: `${api}/profile` },
      { name: 'GET /profile/preferences', url: `${api}/profile/preferences` },
      { name: 'GET /admin/dashboard/stats', url: `${api}/admin/dashboard/stats` },
    ];
    for (const c of authChecks) {
      try {
        const res = await fetch(c.url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (res.status === 200) console.log(`✓ ${c.name}`);
        else {
          console.error(`✗ ${c.name} — HTTP ${res.status}`);
          failed++;
        }
      } catch (e) {
        console.error(`✗ ${c.name} — ${e.message}`);
        failed++;
      }
    }
  } else {
    console.warn('⚠ Tests authentifiés ignorés (pas de token).');
  }

  if (failed > 0) {
    console.error(`\n${failed} échec(s). Lancez Laravel : php artisan serve --host=0.0.0.0 --port=8000`);
    process.exit(1);
  }
  console.log('\n✓ Smoke API terminé.');
}

main();
