import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/api';
import { adminContentService } from '@/services/admin-content.service';
import { carsService } from '@/services/cars.service';
import { agenciesService } from '@/services/agencies.service';
import type { Car, PartnerAgency } from '@/types';

import { t } from '@/i18n';

/** Contenu > À la une: cars and agencies put forward on the home page, and their order. */
export default function FeaturedPanel() {
  const queryClient = useQueryClient();
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [priority, setPriority] = useState('10');

  const { data: carsPage, isLoading: carsLoading } = useQuery({
    queryKey: ['admin-content-cars'],
    queryFn: () => carsService.getAll(1, ''),
  });

  const { data: agenciesPage, isLoading: agenciesLoading } = useQuery({
    queryKey: ['admin-content-agencies'],
    queryFn: () => agenciesService.list({ page: 1 }),
  });

  const cars = carsPage?.data ?? [];
  const agencies = agenciesPage?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-content-cars'] });

  const requireCar = () => {
    if (!selectedCarId) {
      Alert.alert(t('Sélection'), t('Choisissez un véhicule dans la liste.'));
      return false;
    }
    return true;
  };

  const requireAgency = () => {
    if (!selectedAgencyId) {
      Alert.alert(t('Sélection'), t('Choisissez une agence dans la liste.'));
      return false;
    }
    return true;
  };

  const carFeatured = useMutation({
    mutationFn: () => adminContentService.toggleCarFeatured(selectedCarId!),
    onSuccess: () => { invalidate(); Alert.alert('OK', t('Mise en avant véhicule basculée.')); },
  });
  const carHomepage = useMutation({
    mutationFn: () => adminContentService.toggleCarHomepage(selectedCarId!),
    onSuccess: () => { invalidate(); Alert.alert('OK', t('Affichage page d’accueil basculé.')); },
  });
  const carPriority = useMutation({
    mutationFn: () => adminContentService.updateCarPriority(selectedCarId!, Number(priority)),
    onSuccess: () => { invalidate(); Alert.alert('OK', t('Priorité mise à jour.')); },
  });
  const agencyFeatured = useMutation({
    mutationFn: () => adminContentService.toggleAgencyFeatured(selectedAgencyId!),
    onSuccess: () => { invalidate(); Alert.alert('OK', t('Mise en avant agence basculée.')); },
  });
  const agencyHomepage = useMutation({
    mutationFn: () => adminContentService.toggleAgencyHomepage(selectedAgencyId!),
    onSuccess: () => { invalidate(); Alert.alert('OK', t('Affichage page d’accueil basculé.')); },
  });

  const loading = carsLoading || agenciesLoading;

  return (
    <>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <View>

          <Text style={styles.section}>{t('Véhicule')}</Text>
          <Text style={styles.hint}>{t('Sélectionnez un véhicule du parc (plus besoin de saisir l’ID).')}</Text>
          <View style={styles.picker}>
            {cars.length === 0 ? (
              <Text style={styles.empty}>{t('Aucun véhicule.')}</Text>
            ) : (
              cars.slice(0, 30).map((car: Car) => (
                <PickerRow
                  key={car.id}
                  label={carLabel(car)}
                  selected={selectedCarId === car.id}
                  onPress={() => setSelectedCarId(car.id)}
                />
              ))
            )}
          </View>
          <TextInput
            style={styles.input}
            value={priority}
            onChangeText={setPriority}
            placeholder={t('Priorité homepage (ex. 10)')}
            keyboardType="numeric"
          />
          <View style={styles.row}>
            <Btn label={t('À la une')} onPress={() => requireCar() && carFeatured.mutate()} />
            <Btn label={t('Accueil')} onPress={() => requireCar() && carHomepage.mutate()} />
            <Btn label={t('Priorité')} onPress={() => requireCar() && carPriority.mutate()} />
          </View>

          <Text style={styles.section}>{t('Agence')}</Text>
          <Text style={styles.hint}>{t('Sélectionnez une agence partenaire.')}</Text>
          <View style={styles.picker}>
            {agencies.length === 0 ? (
              <Text style={styles.empty}>{t('Aucune agence.')}</Text>
            ) : (
              agencies.slice(0, 30).map((agency: PartnerAgency) => (
                <PickerRow
                  key={agency.id}
                  label={agency.name ?? t('Agence #:id', { id: agency.id })}
                  selected={selectedAgencyId === agency.id}
                  onPress={() => setSelectedAgencyId(agency.id)}
                />
              ))
            )}
          </View>
          <View style={styles.row}>
            <Btn label={t('À la une')} onPress={() => requireAgency() && agencyFeatured.mutate()} />
            <Btn label={t('Accueil')} onPress={() => requireAgency() && agencyHomepage.mutate()} />
          </View>
        </View>
      )}
    </>
  );
}

function carLabel(car: Car): string {
  const name = car.name ?? `${car.brand ?? ''} ${car.model ?? ''}`.trim();
  return name ? `${name} (#${car.id})` : t('Véhicule #:id', { id: car.id });
}

function PickerRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.pickerRow, selected && styles.pickerRowOn]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.pickerLabel, selected && styles.pickerLabelOn]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.btnTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  link: { color: COLORS.primary, fontWeight: '600' },
  picker: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10, maxHeight: 220 },
  pickerRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EFEFF4' },
  pickerRowOn: { backgroundColor: '#EBF5FB' },
  pickerLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  pickerLabelOn: { color: COLORS.primary, fontWeight: '700' },
  empty: { padding: 14, color: '#9CA3AF', fontSize: 13 },
  input: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnTxt: { color: '#FFF', fontWeight: '700', fontSize: 12 },
});
