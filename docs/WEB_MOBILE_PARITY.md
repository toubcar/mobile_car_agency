# Parité web Blade ↔ mobile

Le mobile reproduit la **logique métier** et les **routes API** de CarAgency. Le design reste natif (Expo).

## Correspondance des espaces

| Web (Blade) | Mobile | API |
|-------------|--------|-----|
| Client — catalogue | `(tabs)/index`, `search`, `car/[id]` | `/cars`, `/favorites`, `/bookings` |
| Client — profil / préférences | `settings/*`, `view-profile` | `/profile`, `/profile/preferences` |
| Client — notifications | `(tabs)/messages`, `notifications` (admin/agence) | `/notifications`, `/messages/*` |
| Agence — dashboard | `(agence)/index`, `modules` | `/agence/dashboard/*`, backoffice |
| Agence — flotte | `(agence)/cars`, `car-form` | `/agence/cars`, `/fleet/*` |
| Agence — finance | `(agence)/finance`, `pricing` | `/agence/finance/*` |
| Admin — dashboard | `(admin)/index`, `modules` | `/admin/dashboard/*`, backoffice |
| Admin — agences | `(admin)/agencies` | `/admin/agencies/*` |
| Admin — finance | `(admin)/finance` | `/admin/finance/*` |
| Admin — contenu | `(admin)/content` | `/admin/content/*` |
| Admin — système | `(admin)/system` | `/admin/system/*` |
| Admin — analytics | `(admin)/analytics` | `/admin/analytics/*` |

## Écrans web sans clone pixel-par-pixel

Pages marketing, layouts Blade complexes, ou formulaires multi-étapes web uniquement : la fonction équivalente est dans **modules** mobile ou un écran dédié listé ci-dessus.

## Maintenir la parité

1. Après modification de `CarAgency/routes/api.php` : `npm run sync:api` puis `npm run check:api`
2. Smoke API : `npm run test:e2e-api` (Laravel doit tourner)
3. Checklist manuelle : `docs/API_COVERAGE_CHECKLIST.md`
