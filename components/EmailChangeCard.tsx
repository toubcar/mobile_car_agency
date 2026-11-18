import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/api';
import { profileService } from '@/services/profile.service';
import { useAuthStore } from '@/store/authStore';
import { serverMessage } from '@/utils/apiError';
import { t } from '@/i18n';

/**
 * Changing the account's e-mail address, the website's way: the current password is asked, a link is sent to the new
 * address (valid 60 minutes) and the current address keeps working until it is opened. A pending change can be sent
 * again or cancelled.
 */
export default function EmailChangeCard() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'save' | 'resend' | 'cancel' | null>(null);

  const run = async (what: 'save' | 'resend' | 'cancel', action: () => Promise<void>) => {
    setBusy(what);
    try {
      await action();
    } catch (err) {
      Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.')));
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    if (!email.trim() || !password) {
      Alert.alert(t('Champs requis'), t('Saisissez la nouvelle adresse et votre mot de passe actuel.'));
      return;
    }
    void run('save', async () => {
      const result = await profileService.requestEmailChange(email.trim(), password);
      updateUser({ pending_email: result.user.pending_email ?? email.trim() });
      setEmail('');
      setPassword('');
      Alert.alert(t('Confirmez votre nouvelle adresse e-mail'), result.message);
    });
  };

  const resend = () => void run('resend', async () => {
    Alert.alert(t('E-mail envoyé'), await profileService.resendEmailChange());
  });

  const cancel = () => void run('cancel', async () => {
    const result = await profileService.cancelEmailChange();
    updateUser({ pending_email: null });
    Alert.alert(t('Annulé'), result.message);
  });

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="mail-outline" size={18} color={COLORS.secondary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('Adresse e-mail actuelle')}</Text>
          <Text style={styles.value} selectable>{user?.email}</Text>
        </View>
      </View>

      {user?.pending_email ? (
        <View style={styles.pending}>
          <Text style={styles.pendingText}>
            {t('Nouvelle adresse en attente de confirmation : :email. Ouvrez le lien envoyé à cette adresse (valable :minutes minutes) ; d\'ici là, votre adresse actuelle reste utilisée.', { email: user.pending_email, minutes: 60 })}
          </Text>
          <View style={styles.pendingActions}>
            <TouchableOpacity style={styles.linkBtn} onPress={resend} disabled={busy !== null}>
              {busy === 'resend' ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.linkText}>{t('Renvoyer le lien')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={cancel} disabled={busy !== null}>
              {busy === 'cancel' ? <ActivityIndicator size="small" color="#B91C1C" /> : <Text style={[styles.linkText, { color: '#B91C1C' }]}>{t('Annuler le changement')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>{t('Nouvelle adresse e-mail')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="nom@exemple.com"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.label}>{t('Mot de passe actuel')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.hint}>{t('Demandé seulement pour changer d\'adresse e-mail : un lien de confirmation est alors envoyé à la nouvelle adresse.')}</Text>
          <TouchableOpacity style={[styles.button, busy === 'save' && { opacity: 0.7 }]} onPress={save} disabled={busy !== null} activeOpacity={0.85}>
            {busy === 'save' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{t('Changer d\'adresse e-mail')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.lightGray, padding: 16, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 11, color: COLORS.gray, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  value: { fontSize: 15, color: COLORS.black, fontWeight: '700' },
  pending: { backgroundColor: '#FFFBEB', borderRadius: 14, borderWidth: 1, borderColor: '#FDE68A', padding: 12, gap: 10 },
  pendingText: { fontSize: 13, color: '#92400E', lineHeight: 19 },
  pendingActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  linkBtn: { paddingVertical: 4, minHeight: 24, justifyContent: 'center' },
  linkText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  form: { gap: 6 },
  input: { borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.black, marginBottom: 8, backgroundColor: COLORS.background },
  hint: { fontSize: 12, color: COLORS.gray, lineHeight: 17 },
  button: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
});
