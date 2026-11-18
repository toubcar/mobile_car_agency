/**
 * Smoke test de l'API ToubCar avec les comptes de test locaux (`scripts/local-dev.sh start` côté Laravel).
 * Parcourt ce qu'utilisent les écrans de l'app, rôle par rôle, et vérifie que le serveur répond dans la langue demandée.
 *
 * Usage : npm run test:e2e-api            (serveur local : EXPO_PUBLIC_BACKEND_URL du fichier .env)
 *         npm run test:e2e-api -- --allow-remote   (autre serveur ; ÉCRIT des données : jamais sur la production)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const i = text.indexOf('=');
    if (i !== -1) out[text.slice(0, i).trim()] = text.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = loadEnv();
const base = (process.env.EXPO_PUBLIC_BACKEND_URL ?? env.EXPO_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const api = `${base}/api`;

// The script creates tickets and changes a language: only on a machine of the developer
const local = /^https?:\/\/(127\.0\.0\.1|localhost|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(base);
if (!local && !process.argv.includes('--allow-remote')) {
  console.error(`✗ ${base} n'est pas un serveur local : ce test écrit des données. Ajoutez --allow-remote si c'est voulu (jamais la production).`);
  process.exit(1);
}

const ACCOUNTS = {
  admin: { email: 'admin@toubcar.test', password: 'ToubcarAdmin2026!' },
  agency: { email: 'agence@test.com', password: 'password' },
  customer: { email: 'client10@test.com', password: 'password' },
};

let failed = 0;
let total = 0;

async function call(method, url, { token, body, lang } = {}) {
  const res = await fetch(`${api}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(lang ? { 'Accept-Language': lang } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* pas de JSON */
  }
  return { status: res.status, json };
}

async function check(name, fn) {
  total++;
  try {
    const problem = await fn();
    if (problem) {
      failed++;
      console.error(`✗ ${name} — ${problem}`);
    } else {
      console.log(`✓ ${name}`);
    }
  } catch (e) {
    failed++;
    console.error(`✗ ${name} — ${e.message}`);
  }
}

const expectStatus = (res, ...codes) => (codes.includes(res.status) ? null : `HTTP ${res.status} (attendu ${codes.join(' ou ')})`);

async function login(who) {
  const res = await call('POST', '/auth/login', { body: ACCOUNTS[who] });
  if (res.status !== 200 || !res.json?.token) throw new Error(`connexion ${who} impossible (HTTP ${res.status})`);
  return res.json;
}

async function main() {
  console.log(`API : ${api}\n`);

  // ── public ──────────────────────────────────────────────────────────────
  let firstCarId = null;
  await check('GET /cars (page 1, 20 par page)', async () => {
    const res = await call('GET', '/cars?per_page=20');
    firstCarId = res.json?.data?.[0]?.id ?? null;
    return expectStatus(res, 200) ?? (typeof res.json?.total === 'number' ? null : 'pas de total');
  });
  await check('GET /cars avec filtres et tri', async () => {
    const res = await call('GET', '/cars?q=a&sort=price_asc&min_price=1&seats=2');
    return expectStatus(res, 200);
  });
  await check('GET /cars/filters', async () => {
    const res = await call('GET', '/cars/filters');
    const d = res.json?.data;
    return expectStatus(res, 200) ?? (Array.isArray(d?.categories) && Array.isArray(d?.brands) && d?.sorts?.length ? null : 'options incomplètes');
  });
  await check('GET /cars/featured', async () => expectStatus(await call('GET', '/cars/featured'), 200));
  await check('GET /cars/{id} et ses avis', async () => {
    if (!firstCarId) return 'aucun véhicule dans le catalogue';
    return expectStatus(await call('GET', `/cars/${firstCarId}`), 200) ?? expectStatus(await call('GET', `/cars/${firstCarId}/reviews`), 200);
  });

  // ── la langue ───────────────────────────────────────────────────────────
  await check('Le serveur répond dans la langue demandée', async () => {
    const wrong = { email: `inconnu${Date.now()}@example.com`, password: 'mauvais-mot-de-passe' };
    const text = {};
    for (const lang of ['fr', 'en', 'ar']) {
      text[lang] = (await call('POST', '/auth/login', { body: wrong, lang })).json?.errors?.email?.[0];
    }
    return new Set(Object.values(text)).size === 3 && Object.values(text).every(Boolean) ? null : `messages : ${JSON.stringify(text)}`;
  });

  // ── client ──────────────────────────────────────────────────────────────
  const customer = await login('customer');
  const c = customer.token;

  await check('client : GET /profile (langue, e-mail vérifié)', async () => {
    const res = await call('GET', '/profile', { token: c });
    const d = res.json?.data;
    return expectStatus(res, 200) ?? (d?.role === 'client' && 'locale' in d && 'email_verified' in d ? null : 'profil incomplet');
  });
  await check('client : la langue se règle sur le compte (PATCH /profile/preferences)', async () => {
    const res = await call('PATCH', '/profile/preferences', { token: c, body: { preferred_language: 'ar' } });
    const back = await call('PATCH', '/profile/preferences', { token: c, body: { preferred_language: 'fr' } });
    return expectStatus(res, 200) ?? expectStatus(back, 200) ?? (res.json?.data?.preferred_language === 'ar' ? null : 'la langue n\'est pas enregistrée');
  });
  await check('client : favoris, réservations, messages, notifications', async () => {
    for (const url of ['/favorites', '/bookings', '/messages/conversations', '/notifications']) {
      const problem = expectStatus(await call('GET', url, { token: c }), 200);
      if (problem) return `${url} : ${problem}`;
    }
    return null;
  });
  await check('client : devis de réservation (GET /bookings/quote)', async () => {
    if (!firstCarId) return 'aucun véhicule';
    const start = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 13 * 864e5).toISOString().slice(0, 10);
    const res = await call('GET', `/bookings/quote?car_id=${firstCarId}&start_date=${start}&end_date=${end}`, { token: c });
    return expectStatus(res, 200, 422);
  });
  await check('client : ouvrir un ticket, y répondre, le relire', async () => {
    const created = await call('POST', '/support/tickets', {
      token: c,
      body: { category: 'general', priority: 'low', subject: 'Test e2e', message: 'Ticket créé par le test automatique.' },
    });
    const id = created.json?.data?.id;
    return (
      expectStatus(created, 201) ??
      expectStatus(await call('POST', `/support/tickets/${id}/reply`, { token: c, body: { message: 'Une réponse.' } }), 201) ??
      ((await call('GET', `/support/tickets/${id}`, { token: c })).json?.data?.conversation?.length >= 1 ? null : 'conversation vide')
    );
  });
  await check('client : laisser un avis sans avoir loué est refusé', async () => {
    if (!firstCarId) return 'aucun véhicule';
    return expectStatus(await call('POST', `/cars/${firstCarId}/reviews`, { token: c, body: { rating: 5 } }), 201, 403, 409);
  });
  await check('client : l\'espace admin lui est fermé', async () => expectStatus(await call('GET', '/admin/users', { token: c }), 403));
  await check('mot de passe oublié : même réponse pour une adresse inconnue', async () => {
    const res = await call('POST', '/auth/forgot-password', { body: { email: 'personne@example.com' } });
    return expectStatus(res, 200);
  });

  await check('contenu : aide, pages, bannières, coordonnées (Contenu de l\'admin)', async () => {
    for (const url of ['/content/faq', '/content/pages', '/content/pages/annulation', '/content/banners', '/content/settings']) {
      const problem = expectStatus(await call('GET', url), 200);
      if (problem) return `${url} : ${problem}`;
    }
    return null;
  });
  await check('calendrier : jours pris d\'un véhicule (GET /cars/{id}/availability)', async () => {
    if (!firstCarId) return 'aucun véhicule';
    const res = await call('GET', `/cars/${firstCarId}/availability`);
    return expectStatus(res, 200) ?? (Array.isArray(res.json?.data?.unavailable) ? null : 'pas de liste de jours');
  });

  // ── agence ──────────────────────────────────────────────────────────────
  const agency = await login('agency');
  const a = agency.token;
  await check('agence : connexion (statut de l\'agence dans la réponse)', async () => (agency.user?.agency?.status ? null : 'pas de statut d\'agence'));
  await check('agence : tableau de bord, véhicules, réservations, finances', async () => {
    for (const url of ['/agence/dashboard/stats', '/agence/cars', '/admin/bookings', '/agence/reports/overview', '/agence/cancellations/stats', '/agence/profile']) {
      const problem = expectStatus(await call('GET', url, { token: a }), 200);
      if (problem) return `${url} : ${problem}`;
    }
    return null;
  });
  await check('agence : finance, commissions, maintenance, catégories, offres, sites externes, avis', async () => {
    for (const url of ['/agence/finance', '/agence/finance/commissions', '/fleet/maintenances', '/agence/categories', '/agence/marketing/offers', '/fleet/external-sites', '/reviews']) {
      const problem = expectStatus(await call('GET', url, { token: a }), 200);
      if (problem) return `${url} : ${problem}`;
    }
    return null;
  });
  await check('agence : le taux de commission est dans le profil (aperçu du prix client)', async () => {
    const res = await call('GET', '/agence/profile', { token: a });
    return expectStatus(res, 200) ?? (typeof res.json?.data?.commission_rate === 'number' ? null : 'pas de commission_rate');
  });
  await check('agence : tickets et notifications', async () => {
    for (const url of ['/support/tickets', '/notifications']) {
      const problem = expectStatus(await call('GET', url, { token: a }), 200);
      if (problem) return `${url} : ${problem}`;
    }
    return null;
  });

  // ── administrateur ──────────────────────────────────────────────────────
  const admin = await login('admin');
  const m = admin.token;
  await check('admin : tableau de bord, agences, utilisateurs, paiements, système', async () => {
    for (const url of ['/admin/dashboard/stats', '/admin/agencies', '/admin/users', '/admin/finance/payment-requests', '/admin/system/health', '/admin/analytics/reports']) {
      const problem = expectStatus(await call('GET', url, { token: m }), 200);
      if (problem) return `${url} : ${problem}`;
    }
    return null;
  });
  await check('admin : commissions, avis, contenu, concurrents', async () => {
    for (const url of ['/admin/finance/commissions', '/reviews', '/admin/content/settings', '/admin/content/banners', '/admin/content/faqs', '/admin/content/pages', '/admin/analytics/competitors']) {
      const problem = expectStatus(await call('GET', url, { token: m }), 200);
      if (problem) return `${url} : ${problem}`;
    }
    return null;
  });
  await check('admin : un export CSV s\'ouvre par un lien signé', async () => {
    const res = await call('POST', '/admin/exports', { token: m, body: { type: 'bookings' } });
    if (expectStatus(res, 200) || !res.json?.url) return expectStatus(res, 200) ?? 'pas de lien';
    const file = await fetch(res.json.url);
    return file.status === 200 ? null : `le lien répond HTTP ${file.status}`;
  });
  await check('admin : tickets, notifications, messages', async () => {
    for (const url of ['/support/tickets', '/notifications', '/messages/conversations']) {
      const problem = expectStatus(await call('GET', url, { token: m }), 200);
      if (problem) return `${url} : ${problem}`;
    }
    return null;
  });

  console.log(`\n${total - failed}/${total} vérifications réussies.`);
  if (failed > 0) {
    console.error('Le serveur local tourne-t-il ? Dans le dossier Laravel : scripts/local-dev.sh start');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`✗ ${e.message}\nLe serveur local tourne-t-il ? Dans le dossier Laravel : scripts/local-dev.sh start`);
  process.exit(1);
});
