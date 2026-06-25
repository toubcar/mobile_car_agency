# Couverture API mobile ↔ Laravel (CarAgency)

Ce document complète la vérification **automatisée** (`npm run check:api`) par une **vue métier** : écrans → services → routes.

## Vérification automatique

| Commande | Rôle |
|----------|------|
| `npm run check:api` | Compare `tooling/api-routes.snapshot.json` au code dans `services/` et `app/`. Échoue si une route requise n’apparaît nulle part. |
| `npm run sync:api` | Régénère le snapshot depuis `CarAgency/routes/api.php`. |
| `npm run test:e2e-api` | Smoke HTTP contre Laravel (login, profile, preferences, admin stats). |
| `npm run test:all` | `typecheck` + `check:api` + `test:ci`. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:ci` | Jest (`__tests__/*.test.ts`) — services auth/profile + navigation rôle. |
| `npm run test:coverage` | Jest avec rapport de couverture (fichiers `utils/`). |

**Mise à jour du snapshot** : `npm run sync:api` (lit `CarAgency/routes/api.php`), puis `npm run check:api`.

**Préférences client** : `GET/PATCH /api/profile/preferences` (aligné web `client.preferences` + clés `mobile.*`).

## Routes optionnelles (hors snapshot obligatoire)

Ces endpoints existent côté Laravel pour **sites externes / disponibilité** ; le mobile peut les intégrer plus tard :

- `POST /cars/check-availability`
- `POST /external-sites/register`
- `GET /cars/{registration_number}/external-sites`

## Matrice écrans → services (résumé)

| Zone app | Fichiers / écrans | Services principaux |
|----------|-------------------|------------------------|
| Auth | `(auth)/login`, `onboarding`, `phone`, `register` | `auth.service` |
| Client | `(tabs)/*`, `car/*`, `booking/*` | `cars`, `bookings`, `auth` |
| Admin | `(admin)/*`, `modules` | `backoffice`, `dashboard`, `agencies`, `bookings`, `users`, `admin-system`, `admin-content`, `admin-analytics`, `finance`, `support`, `customers`, `notifications`, `messages`, `cars` (`scope` admin) |
| Agence | `(agence)/*`, `modules` | idem + `agency-profile`, `marketing`, `reports`, `pricing`, `finance`, `external-sites`, `maintenance`, `cars` (`scope` agence) |

## Tests manuels recommandés (checklist courte)

- [ ] Connexion client (email + OTP téléphone + Google/Apple depuis onboarding **et** AuthBottomSheet accueil).
- [ ] Connexion staff (`scope=staff`) admin / agence → bon espace racine.
- [ ] Liste / détail / création réservation client.
- [ ] Admin : agences (approve/reject/suspend), bookings statut, utilisateurs.
- [ ] Agence : dashboard, module profil + upload document, finance demande paiement, marketing offre.

## CI GitHub Actions

Workflow : `.github/workflows/ci.yml` — enchaîne `npm ci --legacy-peer-deps`, `typecheck`, `check:api`, `test:ci`.

**Emplacement** : à la racine du dépôt **où se trouve `package.json`** (dossier `ToubcarMobile` si le repo Git est ce dossier).

Si le dépôt Git est le parent `Toubcar-Mobile/` contenant `ToubcarMobile/`, déplacer le workflow vers `.github/workflows/ci.yml` à la racine du repo et ajouter :

```yaml
defaults:
  run:
    working-directory: ToubcarMobile
```
