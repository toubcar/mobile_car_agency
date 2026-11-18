/**
 * Vérifie que l’environnement est prêt avant de lancer l’app (npm run verify:test).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

function ok(msg) {
  console.log('✓', msg);
}
function fail(msg) {
  console.error('✗', msg);
  failed = true;
}

if (!fs.existsSync(path.join(root, 'node_modules'))) {
  fail('node_modules manquant → npm install --legacy-peer-deps');
} else {
  ok('node_modules présent');
}

if (!fs.existsSync(path.join(root, '.env'))) {
  fail('.env manquant → copier .env.example vers .env');
} else {
  ok('.env présent');
}

const candidates = [
  path.resolve(root, '..', '..', 'Cars', 'CarAgency'),
  path.resolve(root, '..', 'CarAgency'),
  path.resolve(root, '..', '..', 'car-agency'),
];
const backendPath = candidates.find((p) => fs.existsSync(path.join(p, 'artisan'))) ?? null;

if (backendPath) {
  ok(`Backend Laravel détecté : ${backendPath}`);
  if (!fs.existsSync(path.join(backendPath, '.env'))) {
    fail('CarAgency/.env manquant — cp .env.example .env && php artisan key:generate');
  } else {
    ok('CarAgency/.env présent');
  }
} else {
  console.warn('⚠ Dossier CarAgency non trouvé à côté du projet — lancez Laravel manuellement.');
}

console.log('\nComptes de test (après php artisan migrate --seed dans CarAgency) :');
console.log('  Admin  : admin@toubcar.test / ToubcarAdmin2026!');
console.log('  Agence : agence@test.com / password');
console.log('\nLancer backend : cd CarAgency && php artisan serve --host=0.0.0.0 --port=8000');
console.log('Lancer mobile  : cd ToubcarMobile && npx expo start\n');

process.exit(failed ? 1 : 0);
