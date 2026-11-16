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
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/api';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { useResponsiveLayout } from '@/utils/responsiveLayout';

import { t } from '@/i18n';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { isCompact, scrollContentStyle, headerGradientHeight, insets } = useResponsiveLayout({
    bottomExtra: 32,
  });
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('Champ requis'), t('Le nom complet est obligatoire.'));
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/profile', { name: name.trim(), email: email.trim(), phone: phone.trim() });
      updateUser({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      Alert.alert(t('Enregistré'), t('Votre profil a été mis à jour.'), [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert(t('Erreur'), t('Enregistrement impossible. Réessayez.'));
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
      <PageHeader title={t('Informations personnelles')} />

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
          <Text style={styles.sectionTitle}>{t('Vos coordonnées')}</Text>
          <View style={styles.card}>
            <View style={[styles.field, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>{t('Nom complet')}</Text>
              <TextInput
                style={[styles.fieldInput, isCompact && styles.fieldInputCompact]}
                value={name}
                onChangeText={setName}
                placeholder={t('Votre nom')}
                placeholderTextColor={COLORS.gray}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.field, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>{t('E-mail')}</Text>
              <TextInput
                style={[styles.fieldInput, isCompact && styles.fieldInputCompact]}
                value={email}
                onChangeText={setEmail}
                placeholder="vous@exemple.com"
                placeholderTextColor={COLORS.gray}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('Téléphone')}</Text>
              <TextInput
                style={[styles.fieldInput, isCompact && styles.fieldInputCompact]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+212 600 000 000"
                placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isCompact && styles.saveBtnCompact, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('Enregistrer')}</Text>
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
  fieldInput: { fontSize: 16, color: COLORS.black, fontWeight: '600', paddingVertical: 0 },
  fieldInputCompact: { fontSize: 15 },
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
