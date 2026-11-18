import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/** Ouvre une page du site (facture, export, document) dans le navigateur intégré, sinon dans le navigateur du téléphone. */
export async function openInBrowser(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
