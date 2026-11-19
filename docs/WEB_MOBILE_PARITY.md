# Parité web Blade ↔ mobile

Le mobile reproduit la **logique métier** et les **routes API** de CarAgency. Le design reste natif (Expo).

## Correspondance des espaces

| Web (Blade) | Mobile | API |
|-------------|--------|-----|
| Langue FR / EN / AR (menu du site) | `settings/language`, sélecteur sur le profil invité et l'écran d'attente agence | en-tête `Accept-Language`, `/profile/preferences` |
| Client — catalogue, filtres, tri | `(tabs)/index`, `search`, `search-filters`, `car/[id]` | `/cars`, `/cars/filters`, `/favorites`, `/bookings` |
| Client — recherche : villes proposées pendant la saisie (toutes orthographes, voitures disponibles), dates du séjour | `search-filters` (champ Ville, « Dates de location ») | `/cities/search` (route du site), `/cars?location=&start_date=&end_date=` |
| Client — calendrier (jours pris en rouge, jour de retour) | `booking/create` (`BookingDateRangePicker`) | `/cars/{id}/availability` |
| Client — réserver et payer (PayPal, 15 minutes pour payer) | `booking/create`, `booking/[id]`, `payment-return` | `/bookings`, `/bookings/{id}/payment`, `/bookings/{id}/payment/capture` |
| Client — annuler (politique d'annulation) | `booking/[id]` | `DELETE /bookings/{id}` |
| Client — avis d'une location terminée, réponse de l'agence | `booking/[id]`, `car/[id]` (section avis) | `/bookings/{id}/review`, `/cars/{id}/reviews` |
| Client — aide (FAQ), pages légales, coordonnées, bannières | `help`, `pages/[slug]`, `(tabs)/index` (bannières) | `/content/faq`, `/content/pages`, `/content/pages/{slug}`, `/content/settings`, `/content/banners` |
| Client — changer d'adresse e-mail (lien de confirmation) | `settings/login-security` | `PUT /profile/email`, `/profile/email/resend`, `DELETE /profile/email` |
| Client — profil, documents, mot de passe | `settings/personal-info`, `settings/login-security`, `view-profile` | `/profile`, `/profile/picture`, `/profile/documents`, `/profile/password` |
| Client — mot de passe oublié, e-mail à confirmer | `(auth)/forgot-password`, bandeau du profil | `/auth/forgot-password`, `/auth/email/resend` |
| Client / agence — notifications | `my-notifications` | `/notifications` |
| Client / agence — assistance (tickets) | `assistance`, `assistance/new`, `assistance/[id]` | `/support/tickets` |
| Client — messages d'une réservation | `(tabs)/messages`, `messages/[rentalId]` | `/messages/*` |
| Agence — inscription et attente de validation | `(auth)/register?type=agency`, écran de statut dans `(agence)` | `/auth/register` (role agence) |
| Agence — dashboard | `(agence)/index`, `modules` | `/agence/dashboard/*`, backoffice |
| Agence — corriger et renvoyer une demande rejetée | `agency-application` (depuis l'écran « Demande rejetée ») | `/agence/application` |
| Agence — flotte, prix client affiché (commission incluse) | `(agence)/cars`, `car-form` | `/agence/cars`, `/fleet/*`, `/agence/profile` (taux) |
| Agence — maintenance | `(agence)/maintenance` | `/fleet/maintenances` |
| Agence — catégories (partagées, modifiables par leur créatrice) | `(agence)/categories` | `/agence/categories` |
| Agence — offres spéciales | `(agence)/offers` | `/agence/marketing/offers` |
| Agence — sites externes | `(agence)/external-sites` | `/fleet/external-sites`, `/fleet/cars/{car}/external-sites` |
| Agence — avis clients et réponses | `(agence)/reviews` | `/reviews`, `/reviews/{id}/reply` |
| Agence — son argent chez ToubCar (disponible, à venir, virements en cours) sur le tableau de bord | `(agence)/(dashboard)/index` (`MoneyCard`) | `/agence/finance` |
| Agence — finance (solde, gains à venir, virements vers le compte enregistré) et commissions | `(agence)/finance`, `(agence)/commissions`, `pricing` | `/agence/finance`, `/agence/finance/commissions`, `/agence/finance/request-payment` |
| Agence — compte bancaire des virements (RIB vérifié, mot de passe, e-mail d'alerte) | `(agence)/bank-account`, onglet « Compte bancaire » du profil | `GET/PUT /agence/bank-account` |
| Agence — facture d'une réservation | `booking/[id]` (bouton « Facture ») | `/agence/bookings/{id}/invoice` (lien signé 30 min) |
| Admin — dashboard | `(admin)/index`, `modules` | `/admin/dashboard/*`, backoffice |
| Admin — agences | `(admin)/agencies` | `/admin/agencies/*` |
| Admin — tickets | `(admin)/support`, `(admin)/ticket/[id]`, `messages/support/[ticketId]` | `/support/tickets`, `/messages/support/*` |
| Admin — finance | `(admin)/finance` | `/admin/finance/*` |
| Admin — commissions, taux de chaque agence | `(admin)/commissions` | `/admin/finance/commissions`, `/admin/agencies/{id}/commission` |
| Admin — avis (masquer, afficher, supprimer) | `(admin)/reviews` (et lien depuis « Clients & avis ») | `/reviews`, `/reviews/{id}/publish`, `/reviews/{id}/hide` |
| Admin — véhicules (liste, export CSV) | `(admin)/(dashboard)/cars` | `/admin/cars`, `/admin/exports` |
| Admin — rapports et exports CSV | `(admin)/reports` | `/admin/analytics/reports`, `/admin/exports` (lien signé 10 min) |
| Admin — concurrents | `(admin)/competitors` | `/admin/analytics/competitors`, `/admin/analytics/competitors/pricing` |
| Admin — contenu (paramètres, bannières, FAQ, pages en FR/EN/AR, à la une) | `(admin)/content` | `/admin/content/*` |
| Admin — système | `(admin)/system` | `/admin/system/*` |
| Admin — analytics | `(admin)/analytics` | `/admin/analytics/*` |

## Ce qui reste propre au site

- Les **campagnes, communications et parrainage** du marketing agence : sur le site ce sont encore des pages vides
  (rien n'est enregistré) ; l'app propose ce qui fonctionne, les offres spéciales.
- Les **offres spéciales** sont enregistrées (site et app) mais ne changent pas encore le prix d'une réservation.
- Les exports CSV et PDF de l'**agence** (paiements, virements, rapport de performance) se font sur le site.

## Écrans web sans clone pixel-par-pixel

Pages marketing, layouts Blade complexes, ou formulaires multi-étapes web uniquement : la fonction équivalente est dans **modules** mobile ou un écran dédié listé ci-dessus.

## Maintenir la parité

1. Après modification de `CarAgency/routes/api.php` : `npm run sync:api` puis `npm run check:api`
   (`CAR_AGENCY_PATH=/chemin/vers/CarAgency npm run sync:api` pour lire un autre dossier)
2. Nouveaux textes : `t('Texte en français')`, puis leur traduction dans `i18n/en.json` et `i18n/ar.json` ;
   `npm run check:i18n` signale ce qui manque
3. Smoke API : `npm run test:e2e-api` (serveur local : `scripts/local-dev.sh start` dans CarAgency)
4. Checklist manuelle : `docs/TEST_LOCAL.md`
