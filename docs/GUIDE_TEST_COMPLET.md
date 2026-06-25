# Guide de test — ToubCar Mobile

## État du projet (prêt à tester ?)

| Élément | Statut |
|--------|--------|
| App Expo (écrans client, admin, agence) | Prêt |
| Services API alignés sur `CarAgency/routes/api.php` | Prêt (117 routes) |
| Fichier `.env` mobile | Créé — **ajuster l’IP si téléphone physique** |
| Tests automatisés (`npm run test:ci`, `check:api`) | Prêt |
| Backend Laravel local | **À lancer vous-même** (voir ci-dessous) |
| Google OAuth (redirect web) | Nécessite route web Laravel + redirect URI |
| Apple Sign In | iOS uniquement |
| Routes API sites externes (`check-availability`) | Optionnel, non branché mobile |

---

## 1. Prérequis (une fois)

### Machine de dev
- Node.js 20+
- PHP 8.2+ + Composer (pour CarAgency)
- MySQL / SQLite configuré dans `CarAgency/.env`

### Mobile
```powershell
cd ToubcarMobile
npm install --legacy-peer-deps
npm run verify:test
```

---

## 2. Démarrer le backend (obligatoire)

```powershell
cd C:\Users\OUSSAMA\Desktop\Cars\CarAgency
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Vérifier dans le navigateur : `http://127.0.0.1:8000/api/cars` → JSON (liste ou tableau vide).

### Comptes de test (seeders)

| Rôle | Email | Mot de passe |
|------|--------|--------------|
| **Admin** | `admin@toubcar.test` | `ToubcarAdmin2026!` |
| **Agence** | `agence@test.com` | `password` |
| **Client** | Inscription dans l’app ou OTP téléphone | — |

---

## 3. Configurer l’URL API sur le mobile

Fichier **`ToubcarMobile/.env`** :

| Appareil | `EXPO_PUBLIC_BACKEND_URL` |
|----------|---------------------------|
| PC + simulateur iOS | `http://127.0.0.1:8000` |
| Émulateur Android | `http://127.0.0.1:8000` (converti auto en `10.0.2.2`) |
| **Téléphone réel** (même Wi‑Fi) | `http://IP_DU_PC:8000` → `ipconfig` |

Après modification du `.env` : **redémarrer Expo** (`npx expo start -c`).

---

## 4. Lancer l’application

```powershell
cd ToubcarMobile
npx expo start
```

- **a** → Android  
- **i** → iOS (Mac)  
- Scanner le QR → Expo Go sur téléphone (avec IP correcte dans `.env`)

---

## 5. Parcours de test recommandés

### A. Client (sans compte)
1. Splash → onglet **Explorer** : liste des voitures (`GET /api/cars`).
2. Ouvrir une voiture → détail.
3. Onglet **Se connecter** → onboarding (Google / Apple / téléphone / email).

### B. Client (connecté)
1. Inscription ou login email.
2. Favoris, réservation test, **Mes réservations**.

### C. Admin
1. Onboarding → **Accès Agence ou Administrateur** → login staff.
2. `admin@toubcar.test` / `ToubcarAdmin2026!`
3. Dashboard, agences, utilisateurs, réservations, modules.

### D. Agence
1. Login staff → `agence@test.com` / `password`
2. Dashboard, véhicules, réservations, module **Profil** → upload document.

---

## 6. Dépannage rapide

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| Network Error | Laravel arrêté ou mauvaise IP | `php artisan serve --host=0.0.0.0` + `.env` IP PC |
| 401 partout | Token expiré | Déconnexion + reconnect |
| 403 admin/agence | Mauvais rôle | Utiliser les comptes seed ci-dessus |
| Liste voitures vide | DB sans données | `php artisan migrate --seed` |
| Expo ne voit pas le .env | Cache | `npx expo start -c` |

---

## 7. Commandes qualité (avant release)

```powershell
npm run typecheck
npm run check:api
npm run test:ci
```

---

## 8. Ce qui reste optionnel (pas bloquant pour un premier test)

- Intégration Google **native** (`POST /auth/google` avec access_token).
- Service mobile pour `POST /cars/check-availability` et sites externes.
- Tests E2E Detox / Maestro.
- Build production (EAS) et certificats Apple / Google Play.
