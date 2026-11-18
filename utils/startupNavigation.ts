/** Autorisé uniquement après connexion ou bouton « Espace pro » dans le profil. */
let proNavigationAllowed = false;

export function allowProNavigation(): void {
  proNavigationAllowed = true;
}

export function resetStartupNavigation(): void {
  proNavigationAllowed = false;
}

/** Au lancement : bloquer admin/agence jusqu'à action explicite de l'utilisateur. */
export function shouldBlockProSpaceOnStartup(): boolean {
  return !proNavigationAllowed;
}
