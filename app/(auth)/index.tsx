import { Redirect } from 'expo-router';

/** Toute entrée dans le groupe (auth) sans écran cible → landing welcome. */
export default function AuthIndex() {
  return <Redirect href="/(auth)/welcome" />;
}
