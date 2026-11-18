/**
 * Vérifie les traductions de l'app.
 *  - chaque texte passé à t('…') / tl('…') existe en anglais ET en arabe (i18n/en.json, i18n/ar.json) ;
 *  - les paramètres (:nom) d'une traduction sont ceux du texte français.
 * Usage : npm run check:i18n   (code de sortie 1 s'il manque quelque chose)
 * Les clés sont les textes français, comme sur le site (resources/lang/en.json, ar.json).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'en.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'ar.json'), 'utf8'));

const SKIP = new Set(['node_modules', '.expo', '__tests__', 'assets', 'docs', 'scripts', 'tooling']);
const DIRS = ['app', 'components', 'hooks', 'contexts', 'utils', 'services', 'store', 'constants', 'i18n'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// t('texte') ou t("texte") — le premier argument littéral
const CALL = /(?<![A-Za-z0-9_$.])tl?\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g;
const used = new Map();

for (const dir of DIRS) {
  for (const file of walk(path.join(root, dir))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(CALL)) {
      const key = (m[1] ?? m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
      if (!used.has(key)) used.set(key, path.relative(root, file));
    }
  }
}

const params = (text) => [...text.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]).sort().join(',');
const problems = [];

for (const [key, file] of used) {
  for (const [name, dict] of [['en', en], ['ar', ar]]) {
    if (!(key in dict)) problems.push(`${name} manquant : « ${key} »  (${file})`);
    else if (params(dict[key]) !== params(key)) problems.push(`${name} : paramètres différents pour « ${key} » → « ${dict[key]} »`);
  }
}

for (const key of Object.keys(en)) {
  if (!(key in ar)) problems.push(`ar manquant (présent en anglais) : « ${key} »`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`✗ ${problems.length} problème(s) de traduction.`);
  process.exit(1);
}

console.log(`✓ Traductions : ${used.size} textes utilisés, tous présents en anglais et en arabe.`);
