import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import axios from 'axios';
import { profileService } from '@/services/profile.service';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { useResponsiveLayout } from '@/utils/responsiveLayout';

import { t } from '@/i18n';

const RULES = [
  { key: 'length', get label() { return t('Au moins 8 caractères'); }, test: (p: string) => p.length >= 8 },
  { key: 'upper', get label() { return t('Une majuscule'); }, test: (p: string) => /[A-Z]/.test(p) },
  { key: 'number', get label() { return t('Un chiffre'); }, test: (p: string) => /[0-9]/.test(p) },
];

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisible,
  isLast,
  isCompact,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  isLast?: boolean;
  isCompact: boolean;
}) {
  return (
    <View style={[styles.field, !isLast && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, isCompact && styles.inputRowCompact]}>
        <TextInput
          style={[styles.fieldInput, isCompact && styles.fieldInputCompact]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder="••••••••"
          placeholderTextColor={COLORS.gray}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggleVisible} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.toggleText, isCompact && styles.toggleTextCompact]}>
            {visible ? t('Masquer') : t('Afficher')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LoginSecurityScreen() {
  const router = useRouter();
  const { isCompact, scrollContentStyle, headerGradientHeight, insets } = useResponsiveLayout({
    bottomExtra: 32,
  });

  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!current) {
      Alert.alert(t('Champ requis'), t('Saisissez votre mot de passe actuel.'));
      return;
    }
    if (!RULES.every((r) => r.test(newPass))) {
      Alert.alert(t('Mot de passe faible'), t('Le nouveau mot de passe ne respecte pas toutes les règles.'));
      return;
    }
    if (newPass !== confirm) {
      Alert.alert(t('Non concordant'), t('Les mots de passe ne correspondent pas.'));
      return;
    }
    setSaving(true);
    try {
      await profileService.changePassword(current, newPass, confirm);
      Alert.alert(t('Mis à jour'), t('Votre mot de passe a été modifié.'), [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      // the server says what is wrong (current password, rules) in the app's language
      const errors = axios.isAxiosError(err) ? (err.response?.data as { errors?: Record<string, string[]> } | undefined)?.errors : undefined;
      Alert.alert(t('Erreur'), (errors ? Object.values(errors)[0]?.[0] : undefined) ?? t('Modification impossible. Vérifiez le mot de passe actuel.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#C8E6F5', COLORS.background]}
        style={[styles.headerGradient, { height: headerGradientHeight }]}
      />
      <PageHeader title={t('Connexion et sécurité')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, scrollContentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>{t('Changer le mot de passe')}</Text>
          <View style={styles.card}>
            <PasswordField
              label={t('Mot de passe actuel')}
              value={current}
              onChangeText={setCurrent}
              visible={show.current}
              onToggleVisible={() => setShow((s) => ({ ...s, current: !s.current }))}
              isCompact={isCompact}
            />
            <PasswordField
              label={t('Nouveau mot de passe')}
              value={newPass}
              onChangeText={setNewPass}
              visible={show.newPass}
              onToggleVisible={() => setShow((s) => ({ ...s, newPass: !s.newPass }))}
              isCompact={isCompact}
            />
            <PasswordField
              label={t('Confirmer le mot de passe')}
              value={confirm}
              onChangeText={setConfirm}
              visible={show.confirm}
              onToggleVisible={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
              isLast
              isCompact={isCompact}
            />
          </View>

          {newPass.length > 0 ? (
            <View style={styles.rulesCard}>
              {RULES.map((r) => {
                const ok = r.test(newPass);
                return (
                  <View key={r.key} style={styles.ruleRow}>
                    <Text style={[styles.ruleBullet, ok && styles.ruleBulletOk]}>•</Text>
                    <Text style={[styles.ruleText, ok && styles.ruleOk]}>{r.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, isCompact && styles.saveBtnCompact, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('Mettre à jour')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: COLORS.background },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scroll: { paddingTop: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  field: { paddingHorizontal: 16, paddingVertical: 14 },
  fieldBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  fieldLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputRowCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  fieldInput: { flex: 1, fontSize: 16, color: COLORS.black, fontWeight: '600', paddingVertical: 0 },
  fieldInputCompact: { fontSize: 15 },
  toggleText: { fontSize: 13, color: COLORS.primary, fontWeight: '700', flexShrink: 0 },
  toggleTextCompact: { alignSelf: 'flex-end' },
  rulesCard: { marginTop: 14, gap: 6, paddingHorizontal: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleBullet: { fontSize: 18, color: COLORS.gray, lineHeight: 20 },
  ruleBulletOk: { color: COLORS.success },
  ruleText: { fontSize: 13, color: COLORS.gray, fontWeight: '500', flex: 1 },
  ruleOk: { color: COLORS.success, fontWeight: '600' },
  saveBtn: {
    marginTop: 28,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnCompact: { paddingVertical: 14 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
