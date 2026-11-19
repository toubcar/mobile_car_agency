import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { agencyProfileService } from '@/services/agency-profile.service';
import AdminStackHeader from '@/components/admin/AdminStackHeader';
import { ADMIN_BG } from '@/constants/adminTheme';
import { Button, Card, Chips, Field, Loading } from '@/components/backoffice/ui';
import { serverMessage } from '@/utils/apiError';
import { isValidAccountNumber } from '@/utils/bankAccount';

import { t, jsLocale } from '@/i18n';

const OTHER = '__other__';

/**
 * The bank account ToubCar transfers the agency's money to (website: Profil > Compte bancaire). The money stays with
 * ToubCar until the agency asks for a transfer, sent to this account only: changing it takes the account's password,
 * and an e-mail tells the agency.
 */
export default function AgencyBankAccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // opened from a transfer request: back to it once the account is saved
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [bank, setBank] = useState('');
  const [otherBank, setOtherBank] = useState('');
  const [holder, setHolder] = useState('');
  const [rib, setRib] = useState('');
  const [password, setPassword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['agency-bank-account'],
    queryFn: () => agencyProfileService.bankAccount(),
  });
  const account = data?.account ?? null;
  const banks = data?.banks ?? [];

  // the registered bank and holder are the starting point of a change (the full number is never sent back)
  useEffect(() => {
    if (!account || bank) return;
    setBank(banks.includes(account.bank_name) ? account.bank_name : OTHER);
    setOtherBank(banks.includes(account.bank_name) ? '' : account.bank_name);
    setHolder(account.account_holder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  const bankName = bank === OTHER ? otherBank.trim() : bank;

  const save = useMutation({
    mutationFn: () => agencyProfileService.saveBankAccount({ bank_name: bankName, account_holder: holder.trim(), rib: rib.trim(), current_password: password }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['agency-bank-account'], saved);
      void queryClient.invalidateQueries({ queryKey: ['agency-finance'] });
      void queryClient.invalidateQueries({ queryKey: ['agency-profile'] });
      setRib('');
      setPassword('');
      Alert.alert(t('Compte bancaire enregistré'), t('Vos prochains virements y seront envoyés.'), [
        { text: t('OK'), onPress: () => { if (from === 'payout') router.back(); } },
      ]);
    },
    onError: (err) => Alert.alert(t('Erreur'), serverMessage(err, t('Réessayez dans un instant.'))),
  });

  const submit = () => {
    if (!bankName || holder.trim().length < 3 || !rib.trim() || !password) {
      Alert.alert(t('Champs requis'), t('Banque, titulaire, RIB et mot de passe sont obligatoires.'));
      return;
    }
    if (!isValidAccountNumber(rib)) {
      Alert.alert(t('RIB invalide'), t('Ce RIB n\'est pas valide : vérifiez ses 24 chiffres (ou l\'IBAN).'));
      return;
    }
    save.mutate();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AdminStackHeader title={t('Compte bancaire')} subtitle={t('Où ToubCar vous vire votre argent')} />
      {isLoading ? <Loading /> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Card style={styles.info}>
              <Ionicons name="business-outline" size={22} color={COLORS.primary} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.infoTitle}>{t('Votre argent reste chez ToubCar jusqu\'à ce que vous le demandiez')}</Text>
                <Text style={styles.infoText}>
                  {t('Quand vous demandez un virement, ToubCar l\'envoie sur ce compte, et seulement sur celui-ci. Pour le changer, votre mot de passe est demandé et un e-mail vous prévient.')}
                </Text>
              </View>
            </Card>

            {account ? (
              <Card style={styles.current}>
                <View style={styles.currentIcon}><Ionicons name="card-outline" size={22} color="#047857" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentKicker}>{t('Compte enregistré')}</Text>
                  <Text style={styles.currentBank}>{account.bank_name} · {account.number}</Text>
                  <Text style={styles.currentHolder}>{account.account_holder}</Text>
                  {account.updated_at ? (
                    <Text style={styles.currentDate}>
                      {t('Modifié le :date', { date: new Date(account.updated_at).toLocaleDateString(jsLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) })}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ) : (
              <Card style={styles.warning}>
                <Text style={styles.warningText}>{t('Aucun compte bancaire enregistré : ajoutez-le pour pouvoir demander vos virements.')}</Text>
              </Card>
            )}

            <Text style={styles.formTitle}>{account ? t('Changer de compte bancaire') : t('Ajouter votre compte bancaire')}</Text>
            <Card>
              <Text style={styles.label}>{t('Banque')}</Text>
              <Chips
                value={bank}
                onChange={setBank}
                options={[...banks.map((name) => ({ value: name, label: name })), { value: OTHER, label: t('Autre banque') }]}
              />
              {bank === OTHER ? (
                <Field label={t('Nom de la banque')} value={otherBank} onChangeText={setOtherBank} style={{ marginTop: 10 }} />
              ) : <View style={{ height: 12 }} />}
              <Field
                label={t('Titulaire du compte')}
                value={holder}
                onChangeText={setHolder}
                placeholder={t('Nom de l\'agence ou du gérant, comme sur le RIB')}
              />
              <Field
                label={t('RIB (24 chiffres)')}
                value={rib}
                onChangeText={setRib}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="000 000 0000000000000000 00"
                hint={t('Les 24 chiffres de votre relevé d\'identité bancaire (l\'IBAN MA… est aussi accepté). Sa clé est vérifiée.')}
              />
              <Field label={t('Mot de passe actuel')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
              <Button
                label={account ? t('Enregistrer le nouveau compte') : t('Enregistrer le compte')}
                icon="checkmark-circle-outline"
                onPress={submit}
                loading={save.isPending}
              />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  scroll: { padding: 14, paddingBottom: 48, gap: 10 },
  info: { flexDirection: 'row', gap: 12, backgroundColor: '#EFF6FF' },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#1E3A8A' },
  infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 19 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  currentKicker: { fontSize: 12, color: '#6B7280' },
  currentBank: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
  currentHolder: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  currentDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  warning: { backgroundColor: '#FFFBEB' },
  warningText: { fontSize: 13, color: '#92400E', lineHeight: 19 },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 8, marginHorizontal: 4 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
});
