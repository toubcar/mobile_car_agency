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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { profileService, type DocumentType, type PickedFile, type ProfileData } from '@/services/profile.service';
import PageHeader from '@/components/PageHeader';
import { COLORS } from '@/constants/api';
import { useResponsiveLayout } from '@/utils/responsiveLayout';
import { t } from '@/i18n';

const DOCUMENTS: { type: DocumentType; label: () => string }[] = [
  { type: 'cin_document', label: () => t('Carte d\'identité (CIN)') },
  { type: 'driving_license_document', label: () => t('Permis de conduire') },
  { type: 'identity_document', label: () => t('Autre pièce d\'identité') },
];

const GENDERS: { key: 'male' | 'female' | 'other'; label: () => string }[] = [
  { key: 'male', label: () => t('Homme') },
  { key: 'female', label: () => t('Femme') },
  { key: 'other', label: () => t('Autre') },
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function apiMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return first ?? data?.message ?? fallback;
}

function initialsOf(name?: string): string {
  return (name ?? '').trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isCompact, scrollContentStyle, headerGradientHeight, insets } = useResponsiveLayout({
    bottomExtra: 32,
  });
  const { user, updateUser } = useAuthStore();
  const isClient = user?.role === 'client';

  const { data: profile } = useQuery({ queryKey: ['profile', 'full'], queryFn: profileService.get, enabled: Boolean(user) });

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [cin, setCin] = useState('');
  const [birth, setBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [license, setLicense] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Fill the form once the full profile arrives
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setPhone(profile.phone ?? '');
    setAddress(profile.address ?? '');
    setCity(profile.city ?? '');
    setPostalCode(profile.postal_code ?? '');
    setCin(profile.cin ?? '');
    setBirth(profile.date_of_birth ?? '');
    setNationality(profile.nationality ?? '');
    setGender(profile.gender ?? '');
    setLicense(profile.driving_license_number ?? '');
    setLicenseExpiry(profile.driving_license_expiry ?? '');
    setEmergencyName(profile.emergency_contact_name ?? '');
    setEmergencyPhone(profile.emergency_contact_phone ?? '');
  }, [profile]);

  const remember = (next: ProfileData) => {
    queryClient.setQueryData(['profile', 'full'], next);
    updateUser({ name: next.name, phone: next.phone ?? undefined, avatar: next.avatar ?? undefined });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('Champ requis'), t('Le nom complet est obligatoire.'));
      return;
    }
    if ((birth && !DATE.test(birth)) || (licenseExpiry && !DATE.test(licenseExpiry))) {
      Alert.alert(t('Date invalide'), t('Écrivez les dates sous la forme AAAA-MM-JJ.'));
      return;
    }

    setSaving(true);
    try {
      const next = await profileService.update({
        name: name.trim(),
        phone: phone.trim(),
        ...(isClient
          ? {
              address: address.trim() || null,
              city: city.trim() || null,
              postal_code: postalCode.trim() || null,
              cin: cin.trim() || null,
              date_of_birth: birth || null,
              nationality: nationality.trim() || null,
              gender: gender || null,
              driving_license_number: license.trim() || null,
              driving_license_expiry: licenseExpiry || null,
              emergency_contact_name: emergencyName.trim() || null,
              emergency_contact_phone: emergencyPhone.trim() || null,
            }
          : {}),
      });
      remember(next);
      Alert.alert(t('Enregistré'), t('Votre profil a été mis à jour.'), [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert(t('Erreur'), apiMessage(err, t('Enregistrement impossible. Réessayez.')));
    } finally {
      setSaving(false);
    }
  };

  const pick = async (types: string[]): Promise<PickedFile | null> => {
    const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
    const asset = result.canceled ? null : result.assets?.[0];
    return asset ? { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } : null;
  };

  const changePicture = async () => {
    const file = await pick(['image/*']);
    if (!file) return;
    setBusy('picture');
    try {
      remember(await profileService.uploadPicture(file));
    } catch (err) {
      Alert.alert(t('Erreur'), apiMessage(err, t('Envoi impossible.')));
    } finally {
      setBusy(null);
    }
  };

  const removePicture = async () => {
    setBusy('picture');
    try {
      remember(await profileService.deletePicture());
    } catch (err) {
      Alert.alert(t('Erreur'), apiMessage(err, t('Suppression impossible.')));
    } finally {
      setBusy(null);
    }
  };

  const sendDocument = async (type: DocumentType) => {
    const file = await pick(['application/pdf', 'image/*']);
    if (!file) return;
    setBusy(type);
    try {
      remember(await profileService.uploadDocument(type, file));
    } catch (err) {
      Alert.alert(t('Erreur'), apiMessage(err, t('Envoi impossible.')));
    } finally {
      setBusy(null);
    }
  };

  const removeDocument = async (type: DocumentType) => {
    setBusy(type);
    try {
      remember(await profileService.deleteDocument(type));
    } catch (err) {
      Alert.alert(t('Erreur'), apiMessage(err, t('Suppression impossible.')));
    } finally {
      setBusy(null);
    }
  };

  const input = [styles.fieldInput, isCompact && styles.fieldInputCompact];

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
          {isClient ? (
            <>
              <Text style={styles.sectionTitle}>{t('Photo de profil')}</Text>
              <View style={styles.card}>
                <View style={styles.avatarRow}>
                  <View style={styles.avatar}>
                    {profile?.avatar ? <Image source={{ uri: profile.avatar }} style={styles.avatarImg} /> : <Text style={styles.avatarInitials}>{initialsOf(name)}</Text>}
                  </View>
                  <View style={styles.avatarActions}>
                    <TouchableOpacity style={styles.smallBtn} onPress={changePicture} disabled={busy === 'picture'} activeOpacity={0.8}>
                      {busy === 'picture' ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.smallBtnText}>{profile?.avatar ? t('Changer la photo') : t('Ajouter une photo')}</Text>}
                    </TouchableOpacity>
                    {profile?.avatar ? (
                      <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={removePicture} disabled={busy === 'picture'} activeOpacity={0.8}>
                        <Text style={[styles.smallBtnText, styles.smallBtnDangerText]}>{t('Supprimer')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
              <View style={styles.sectionSpace} />
            </>
          ) : null}

          <Text style={styles.sectionTitle}>{t('Vos coordonnées')}</Text>
          <View style={styles.card}>
            <View style={[styles.field, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>{t('Nom complet')}</Text>
              <TextInput style={input} value={name} onChangeText={setName} placeholder={t('Votre nom')} placeholderTextColor={COLORS.gray} returnKeyType="next" />
            </View>
            <View style={[styles.field, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>{t('E-mail')}</Text>
              <Text style={[styles.fieldInput, styles.readonly]}>{user?.email}</Text>
              <TouchableOpacity onPress={() => router.push('/settings/login-security')} activeOpacity={0.7}>
                <Text style={[styles.hint, styles.emailLink]}>
                  {user?.pending_email
                    ? t('Nouvelle adresse en attente de confirmation : :email', { email: user.pending_email })
                    : t('Changer d\'adresse e-mail (Connexion et sécurité)')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.field, isClient && styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>{t('Téléphone')}</Text>
              <TextInput style={input} value={phone} onChangeText={setPhone} placeholder="+212 600 000 000" placeholderTextColor={COLORS.gray} keyboardType="phone-pad" returnKeyType="next" />
            </View>
            {isClient ? (
              <>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>{t('Adresse')}</Text>
                  <TextInput style={input} value={address} onChangeText={setAddress} placeholderTextColor={COLORS.gray} />
                </View>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>{t('Ville')}</Text>
                  <TextInput style={input} value={city} onChangeText={setCity} placeholderTextColor={COLORS.gray} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('Code postal')}</Text>
                  <TextInput style={input} value={postalCode} onChangeText={setPostalCode} placeholderTextColor={COLORS.gray} keyboardType="number-pad" />
                </View>
              </>
            ) : null}
          </View>

          {isClient ? (
            <>
              <View style={styles.sectionSpace} />
              <Text style={styles.sectionTitle}>{t('Identité et permis')}</Text>
              <View style={styles.card}>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>{t('CIN')}</Text>
                  <TextInput style={input} value={cin} onChangeText={setCin} autoCapitalize="characters" placeholderTextColor={COLORS.gray} />
                </View>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>{t('Date de naissance')}</Text>
                  <TextInput style={input} value={birth} onChangeText={setBirth} placeholder={t('AAAA-MM-JJ')} placeholderTextColor={COLORS.gray} keyboardType="numbers-and-punctuation" maxLength={10} />
                </View>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>{t('Nationalité')}</Text>
                  <TextInput style={input} value={nationality} onChangeText={setNationality} placeholderTextColor={COLORS.gray} />
                </View>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>{t('Genre')}</Text>
                  <View style={styles.chips}>
                    {GENDERS.map((g) => (
                      <TouchableOpacity key={g.key} style={[styles.chip, gender === g.key && styles.chipOn]} onPress={() => setGender(gender === g.key ? '' : g.key)} activeOpacity={0.8}>
                        <Text style={[styles.chipText, gender === g.key && styles.chipTextOn]}>{g.label()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>{t('Numéro du permis')}</Text>
                  <TextInput style={input} value={license} onChangeText={setLicense} placeholderTextColor={COLORS.gray} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('Fin de validité du permis')}</Text>
                  <TextInput style={input} value={licenseExpiry} onChangeText={setLicenseExpiry} placeholder={t('AAAA-MM-JJ')} placeholderTextColor={COLORS.gray} keyboardType="numbers-and-punctuation" maxLength={10} />
                </View>
              </View>

              <View style={styles.sectionSpace} />
              <Text style={styles.sectionTitle}>{t('Contact en cas d\'urgence')}</Text>
              <View style={styles.card}>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>{t('Nom complet')}</Text>
                  <TextInput style={input} value={emergencyName} onChangeText={setEmergencyName} placeholderTextColor={COLORS.gray} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('Téléphone')}</Text>
                  <TextInput style={input} value={emergencyPhone} onChangeText={setEmergencyPhone} placeholderTextColor={COLORS.gray} keyboardType="phone-pad" />
                </View>
              </View>

              <View style={styles.sectionSpace} />
              <Text style={styles.sectionTitle}>{t('Documents')}</Text>
              <View style={styles.card}>
                {DOCUMENTS.map((doc, index) => {
                  const has = Boolean(profile?.documents?.[doc.type]);

                  return (
                    <View key={doc.type} style={[styles.docRow, index < DOCUMENTS.length - 1 && styles.fieldBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docName}>{doc.label()}</Text>
                        <Text style={styles.docState}>{has ? t('Envoyé') : t('Non envoyé')}</Text>
                      </View>
                      {busy === doc.type ? (
                        <ActivityIndicator color={COLORS.primary} />
                      ) : (
                        <>
                          <TouchableOpacity style={styles.smallBtn} onPress={() => sendDocument(doc.type)} activeOpacity={0.8}>
                            <Text style={styles.smallBtnText}>{has ? t('Remplacer') : t('Ajouter')}</Text>
                          </TouchableOpacity>
                          {has ? (
                            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => removeDocument(doc.type)} activeOpacity={0.8}>
                              <Text style={[styles.smallBtnText, styles.smallBtnDangerText]}>{t('Supprimer')}</Text>
                            </TouchableOpacity>
                          ) : null}
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
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
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 72, height: 72 },
  avatarInitials: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  avatarActions: { flex: 1, gap: 8 },
  smallBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary },
  smallBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  smallBtnDanger: { borderColor: '#EF4444' },
  smallBtnDangerText: { color: '#EF4444' },
  readonly: { color: COLORS.gray },
  emailLink: { color: COLORS.primary, fontWeight: '700' },
  hint: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  chipTextOn: { color: COLORS.white },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  docName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.black },
  docState: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  sectionSpace: { height: 20 },
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
