# Tester l'application en local

Tout tourne sur votre Mac : le site/API Laravel avec une base de test, et l'application.
Rien n'est envoyé (ni e-mail, ni SMS) et la base de production n'est jamais touchée.

> L'application a besoin de l'API de la branche `feature/commissions-reviews-content` de CarAgency
> (paiement PayPal dans l'app, calendrier des disponibilités, commissions, avis, contenu, outils agence et admin).
> Testez avec cette branche, et mettez-la en production **avant** de publier l'application.

---

## 1. Une seule fois : installer les outils

```bash
brew install php composer mariadb node    # si ce n'est pas déjà fait
```

Cette branche ne garde plus le fichier `.env` dans git (il contenait des secrets) : en changeant de branche,
git le retire du dossier. Le serveur local n'en a pas besoin, et il revient quand vous repassez sur `master`,
mais gardez-en une copie : `cp .env ../CarAgency.env.bak`.

```bash
cd CarAgency
git fetch && git checkout feature/commissions-reviews-content
composer install

cd ../mobile_car_agency
git fetch && git checkout feature/sync-with-web
npm install
```

## 2. Démarrer le serveur local (à chaque session)

```bash
cd CarAgency
scripts/local-dev.sh start
```

La première fois, cela prend environ une minute (base créée et remplie de données de test).
La commande affiche ensuite :

- l'adresse du site sur le Mac : http://127.0.0.1:8000
- l'adresse à utiliser depuis un téléphone (même Wi‑Fi) : `http://192.168.x.x:8000`
- les comptes de test :

| Rôle | E-mail | Mot de passe |
|------|--------|--------------|
| Client | `client10@test.com` (ou `client1` … `client15`) | `password` |
| Agence | `agence@test.com` | `password` |
| Admin | `admin@toubcar.test` | `ToubcarAdmin2026!` |

Codes SMS et e-mails (vérification, mot de passe oublié, changement d'adresse) : ils ne partent pas, ils sont écrits
dans `CarAgency/storage/logs/laravel.log`.

**Paiement** : le serveur local simule PayPal. Au moment de payer, une page « Paiement simulé » s'ouvre
avec deux boutons, **Payer** et **Annuler** : aucun compte PayPal n'est nécessaire et rien n'est débité.

Autres commandes : `scripts/local-dev.sh status` (adresses et comptes), `stop`, `reset` (repartir de zéro).

Si macOS demande d'autoriser « php » à recevoir des connexions : **Autoriser** (sinon le téléphone ne voit pas le serveur).

Vérification rapide, depuis le dossier de l'app :

```bash
npm run test:e2e-api      # 25 vérifications : catalogue, contenu, calendrier, client, agence, admin
```

## 3. Lancer l'application

### A. Dans le navigateur (le plus simple, aucun téléphone nécessaire)

```bash
cd mobile_car_agency
npm run web
```

L'app s'ouvre sur http://localhost:8081. Dans Chrome, ouvrez les outils de développement
(`Cmd + Option + I`) puis la vue « téléphone » (`Cmd + Shift + M`) pour avoir la taille d'un mobile.

Limites de cette version : pas de notifications push ni de connexion Google/Apple, et en arabe
le texte est traduit mais la mise en page ne passe pas de droite à gauche (cela ne se voit que sur téléphone).

### B. Sur un téléphone Android

L'app utilise le SDK Expo **54**. L'Expo Go du Play Store ne prend en charge que le dernier SDK :
installez l'Expo Go compatible depuis https://expo.dev/go (choisir **SDK 54**, Android, fichier APK).

```bash
cd mobile_car_agency
npx expo start
```

Scannez le QR code avec Expo Go (le téléphone doit être sur le même Wi‑Fi que le Mac).
L'adresse du serveur est trouvée automatiquement : le fichier `.env` peut garder
`EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8000`.

### C. Sur un iPhone

L'Expo Go de l'App Store ne prend en charge que le dernier SDK : il ne peut pas ouvrir cette version.
Deux possibilités :

- avec Xcode installé sur le Mac : `npx expo run:ios` (simulateur iPhone) ;
- une version de développement : `eas build --profile development --platform ios`
  (compte Apple Developer et compte Expo du projet nécessaires).

À plus long terme : mettre l'app à jour vers le dernier SDK Expo rend de nouveau Expo Go utilisable partout.

---

## 4. Ce qu'il faut tester

**Langues** : Profil → Paramètres du compte → Langue (ou sous « Se connecter » quand on n'est pas
connecté). Français, anglais, arabe. Sur téléphone, passer à l'arabe recharge l'app et inverse la mise en page.
Les messages du serveur (erreurs, notifications) suivent la langue choisie.

**Client** (`client10@test.com`)
1. Catalogue, recherche (marque, ville), écran Filtres (dates, catégorie, marque, boîte, carburant, places, prix), tri.
   Sur l'accueil, les bannières écrites dans Contenu > Bannières.
2. Fiche d'un véhicule : avis des clients et réponses de l'agence.
3. « Réserver » : le calendrier montre en rouge léger les jours déjà pris (non cliquables) ; le premier jour pris
   après le départ reste possible comme jour de retour. « Réserver et payer » ouvre le paiement (simulé en local) :
   **Payer** confirme la réservation ; **Annuler** la garde 15 minutes, le bouton « Payer maintenant » du détail
   permet de payer ensuite.
4. Détail d'une réservation : annuler (une réservation payée n'est pas remboursée, la politique s'affiche) ;
   après une location terminée, « Donner mon avis ».
5. Profil → Aide : questions fréquentes, contact, pages légales (Conditions, Confidentialité, Annulation, Mentions).
6. Profil → Paramètres → Connexion et sécurité : changer d'adresse e-mail (mot de passe actuel demandé ; le lien
   de confirmation est dans `laravel.log`, l'ancienne adresse reste valable jusque-là), changer le mot de passe.
7. Profil → Informations personnelles (photo, documents), Notifications, Assistance (ouvrir un ticket, répondre).
8. Déconnexion, puis « Mot de passe oublié ? » (le lien est dans `laravel.log`).
9. Créer un compte : un bandeau demande de confirmer l'adresse e-mail (lien dans `laravel.log`).

**Agence** (`agence@test.com`)
1. Tableau de bord, véhicules (ajout, modification : le prix affiché aux clients, commission incluse, apparaît sous
   le prix de l'agence), réservations (accepter, refuser), détail d'une réservation → « Facture ».
2. Menu → Finance et virements : solde disponible, gains à venir, virements en cours, taux de commission,
   dernières opérations, demande de virement. Menu → Commissions ToubCar : la commission de chaque réservation.
3. Menu → Maintenance (planifier, commencer, terminer, modifier, supprimer : les jours au garage deviennent rouges
   dans le calendrier du client), Catégories, Sites externes, Offres spéciales, Avis clients (répondre).
4. Menu : Notifications, Assistance, Aide, Langue.
5. Écran d'accueil → « Devenir agence partenaire » : après l'inscription, l'agence voit « Demande en cours
   d'examen » jusqu'à sa validation par l'admin. Rejetée, elle corrige sa demande dans l'app
   (« Corriger et renvoyer ma demande ») ; suspendue, elle voit « Compte suspendu ».

**Admin** (`admin@toubcar.test`)
1. Agences : approuver, rejeter (avec un motif), suspendre, réactiver, commission.
2. Menu → Commissions ToubCar : commissions de la période, taux de chaque agence (modifiable), export CSV.
3. Menu → Avis : masquer, afficher, supprimer. Menu → Rapports et exports : fichiers CSV (réservations,
   commissions, transactions, agences, clients, véhicules). Menu → Concurrents.
4. Menu → Contenu : paramètres (contact, réseaux, taux par défaut), bannières, FAQ et pages, en français,
   anglais et arabe ; ce qui est enregistré apparaît aussitôt sur le site et dans l'app.
5. Assistance : répondre au ticket ouvert par le client ; le client voit la réponse.
6. Finance : demandes de paiement des agences. Système : santé, cache, maintenance (une confirmation est demandée).

---

## 5. En cas de problème

| Symptôme | Que faire |
|----------|-----------|
| « Serveur inaccessible » sur le téléphone | Même Wi‑Fi que le Mac ? `scripts/local-dev.sh status` pour l'adresse ; autoriser « php » dans le pare-feu macOS |
| Le serveur ne démarre pas | `scripts/local-dev.sh status`, puis les journaux dans `CarAgency/.local/` |
| Données incohérentes | `scripts/local-dev.sh reset` puis `start` |
| Le `.env` de l'app a été modifié | Relancer avec `npx expo start -c` |
| « Project is incompatible with this version of Expo Go » | Expo Go trop récent : voir 3.B / 3.C |
| « These migration files are copies and would run twice » | Des copies « … 2.php » (souvent laissées par la synchronisation iCloud du dossier Documents) : les déplacer hors du projet, voir ci-dessous |

Déplacer les copies « … 2.xxx » de CarAgency (seulement les fichiers non suivis par git ; ils sont rangés dans `../copies-CarAgency`, rien n'est supprimé) :

```bash
cd CarAgency
git ls-files --others --exclude-standard | grep ' 2\.[A-Za-z]*$' | while IFS= read -r f; do
  mkdir -p "../copies-CarAgency/$(dirname "$f")" && mv "$f" "../copies-CarAgency/$f"
done
```

## 6. Vérifications automatiques

```bash
npm run test:all       # types, couverture de l'API, traductions, tests unitaires
npm run test:e2e-api   # parcours API rôle par rôle (serveur local démarré)
```

Côté serveur : `scripts/local-dev.sh test` (tests fonctionnels sur la base locale).
