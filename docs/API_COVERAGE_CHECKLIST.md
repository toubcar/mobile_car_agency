# Couverture API mobile ↔ Laravel (CarAgency)

Ce document complète la vérification **automatisée** (`npm run check:api`) par une **vue métier** : écrans → services → routes.

## Vérification automatique

| Commande | Rôle |
|----------|------|
| `npm run check:api` | Compare `tooling/api-routes.snapshot.json` au code dans `services/` et `app/`. Échoue si une route requise n’apparaît nulle part. |
| `npm run sync:api` | Régénère le snapshot depuis `CarAgency/routes/api.php`. |
| `npm run test:e2e-api` | Smoke HTTP contre Laravel : catalogue, contenu, calendrier, client, agence (finance, outils), admin (commissions, contenu, export signé). |
| `npm run check:i18n` | Chaque texte `t('…')` existe en anglais et en arabe, avec les mêmes paramètres. |
| `npm run test:all` | `typecheck` + `check:api` + `check:i18n` + `test:ci`. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:ci` | Jest (`__tests__/*.test.ts`) — services, navigation par rôle, dates du calendrier, paiement PayPal, Markdown des pages, liens de l'admin. |
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
| Client | `(tabs)/*`, `car/*`, `booking/*`, `help`, `pages/[slug]`, `payment-return` | `cars`, `bookings` (paiement, avis), `content`, `profile` (e-mail), `auth` |
| Admin | `(admin)/*`, `modules` | `backoffice`, `dashboard`, `agencies`, `bookings`, `users`, `admin-system`, `admin-content` (paramètres, bannières, FAQ, pages), `admin-analytics`, `finance` (commissions), `exports`, `reviews`, `support`, `customers`, `notifications`, `messages`, `cars` (`scope` admin) |
| Agence | `(agence)/*`, `agency-application`, `modules` | idem + `agency-profile`, `agency-application`, `marketing` (offres), `reports`, `pricing`, `finance` (solde, commissions), `categories`, `external-sites`, `maintenance`, `reviews`, `cars` (`scope` agence) |

## Tests manuels recommandés (checklist courte)

- [ ] Connexion client (email + OTP téléphone + Google/Apple depuis onboarding **et** AuthBottomSheet accueil).
- [ ] Connexion staff (`scope=staff`) admin / agence → bon espace racine.
- [ ] Liste / détail / création réservation client, paiement (PayPal simulé en local), annulation, avis.
- [ ] Admin : agences (approve/reject/suspend), bookings statut, utilisateurs.
- [ ] Agence : dashboard, profil + upload document, finance (solde, commissions, virement), maintenance, catégories, offres, sites externes, avis, facture.
- [ ] Admin : commissions et taux, avis, rapports et exports CSV, concurrents, contenu en trois langues.

## CI GitHub Actions

Workflow : `.github/workflows/ci.yml` — enchaîne `npm ci --legacy-peer-deps`, `typecheck`, `check:api`, `test:ci`.

**Emplacement** : à la racine du dépôt **où se trouve `package.json`** (dossier `ToubcarMobile` si le repo Git est ce dossier).

Si le dépôt Git est le parent `Toubcar-Mobile/` contenant `ToubcarMobile/`, déplacer le workflow vers `.github/workflows/ci.yml` à la racine du repo et ajouter :

```yaml
defaults:
  run:
    working-directory: ToubcarMobile
```
