import { Redirect } from 'expo-router';

/** Ancienne route stack — redirige vers l’onglet Messages. */
export default function AdminMessagesRedirect() {
  return <Redirect href="/(admin)/(dashboard)/messages" />;
}
