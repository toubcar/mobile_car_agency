import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/api';
import { fromIsoDate, toIsoDate } from '@/utils/dates';
import { Field, ui } from './ui';
import { t, jsLocale } from '@/i18n';

/** A day (Y-m-d) chosen with the phone's calendar; typed in the browser version. */
export default function DateField({ label, value, onChange, optional, minimumDate }: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  optional?: boolean;
  minimumDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return <Field label={label} value={value ?? ''} onChangeText={(v) => onChange(v.trim() || null)} placeholder="2026-12-31" autoCapitalize="none" />;
  }

  const date = value ? fromIsoDate(value) : new Date();
  const show = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate,
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) onChange(toIsoDate(picked));
        },
      });
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <View style={ui.field}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[ui.input, styles.input]} onPress={show} activeOpacity={0.8} accessibilityRole="button">
          <Ionicons name="calendar-outline" size={17} color={COLORS.secondary} />
          <Text style={[styles.text, !value && styles.placeholder]}>
            {value ? fromIsoDate(value).toLocaleDateString(jsLocale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : t('Choisir une date')}
          </Text>
        </TouchableOpacity>
        {optional && value ? (
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={8} accessibilityLabel={t('Effacer')}>
            <Ionicons name="close-circle" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>
      {open && Platform.OS === 'ios' ? (
        <View style={styles.inline}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            locale={jsLocale()}
            minimumDate={minimumDate}
            onChange={(_, picked) => picked && onChange(toIsoDate(picked))}
          />
          <TouchableOpacity style={styles.done} onPress={() => setOpen(false)}>
            <Text style={styles.doneText}>{t('Valider')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 15, color: '#111827', textTransform: 'capitalize' },
  placeholder: { color: '#9CA3AF', textTransform: 'none' },
  inline: { backgroundColor: '#FFFFFF', borderRadius: 14, marginTop: 8, paddingBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  done: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
  doneText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
});
