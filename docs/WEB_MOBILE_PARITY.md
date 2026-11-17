# Parité web Blade ↔ mobile

Le mobile reproduit la **logique métier** et les **routes API** de CarAgency. Le design reste natif (Expo).

## Correspondance des espaces

| Web (Blade) | Mobile | API |
|-------------|--------|-----|
| Langue FR / EN / AR (menu du site) | `settings/language`, sélecteur sur le profil invité et l'écran d'attente agence | en-tête `Accept-Language`, `/profile/preferences` |
| Client — catalogue, filtres, tri | `(tabs)/index`, `search`, `search-filters`, `car/[id]` | `/cars`, `/cars/filters`, `/favorites`, `/bookings` |
| Client — avis | `car/[id]` (section avis) | `/cars/{id}/reviews` |
| Client — profil, documents, mot de passe | `settings/personal-info`, `settings/login-security`, `view-profile` | `/profile`, `/profile/picture`, `/profile/documents`, `/profile/password` |
| Client — mot de passe oublié, e-mail à confirmer | `(auth)/forgot-password`, bandeau du profil | `/auth/forgot-password`, `/auth/email/resend` |
| Client / agence — notifications | `my-notifications` | `/notifications` |
| Client / agence — assistance (tickets) | `assistance`, `assistance/new`, `assistance/[id]` | `/support/tickets` |
| Client — messages d'une réservation | `(tabs)/messages`, `messages/[rentalId]` | `/messages/*` |
| Agence — inscription et attente de validation | `(auth)/register?type=agency`, écran de statut dans `(agence)` | `/auth/register` (role agence) |
| Agence — dashboard | `(agence)/index`, `modules` | `/agence/dashboard/*`, backoffice |
| Agence — flotte | `(agence)/cars`, `car-form` | `/agence/cars`, `/fleet/*` |
| Agence — finance | `(agence)/finance`, `pricing` | `/agence/finance/*` |
| Admin — dashboard | `(admin)/index`, `modules` | `/admin/dashboard/*`, backoffice |
| Admin — agences | `(admin)/agencies` | `/admin/agencies/*` |
| Admin — tickets | `(admin)/support`, `(admin)/ticket/[id]`, `messages/support/[ticketId]` | `/support/tickets`, `/messages/support/*` |
| Admin — finance | `(admin)/finance` | `/admin/finance/*` |
| Admin — contenu | `(admin)/content` | `/admin/content/*` |
| Admin — système | `(admin)/system` | `/admin/system/*` |
| Admin — analytics | `(admin)/analytics` | `/admin/analytics/*` |

## Écrans web sans clone pixel-par-pixel

Pages marketing, layouts Blade complexes, ou formulaires multi-étapes web uniquement : la fonction équivalente est dans **modules** mobile ou un écran dédié listé ci-dessus.

## Maintenir la parité

1. Après modification de `CarAgency/routes/api.php` : `npm run sync:api` puis `npm run check:api`
   (`CAR_AGENCY_PATH=/chemin/vers/CarAgency npm run sync:api` pour lire un autre dossier)
2. Nouveaux textes : `t('Texte en français')`, puis leur traduction dans `i18n/en.json` et `i18n/ar.json` ;
   `npm run check:i18n` signale ce qui manque
3. Smoke API : `npm run test:e2e-api` (serveur local : `scripts/local-dev.sh start` dans CarAgency)
4. Checklist manuelle : `docs/TEST_LOCAL.md`
