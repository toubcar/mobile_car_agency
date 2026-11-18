import type { ReactNode } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
  ScrollView, TouchableWithoutFeedback, Switch, type TextInputProps, type StyleProp, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/api';
import { adminShadow } from '@/constants/adminTheme';

/**
 * Les briques des écrans agence et admin (cartes, champs, boutons, filtres, feuille de saisie) :
 * le même style partout, comme les pages du back-office du site.
 */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[ui.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={ui.sectionLabel}>{children}</Text>;
}

export function Stat({ label, value, tone = COLORS.primary }: { label: string; value: string | number; tone?: string }) {
  return (
    <View style={ui.stat}>
      <Text style={[ui.statValue, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={ui.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={ui.statRow}>{children}</View>;
}

export function Badge({ label, color = '#374151', bg = '#F3F4F6' }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[ui.badge, { backgroundColor: bg }]}>
      <Text style={[ui.badgeTxt, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Chips<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.chips}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[ui.chip, on && ui.chipOn]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            accessibilityState={{ selected: on }}
          >
            <Text style={[ui.chipTxt, on && ui.chipTxtOn]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function Field({ label, hint, style, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={ui.field}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        {...input}
        style={[ui.input, input.multiline && ui.textarea, style]}
        textAlignVertical={input.multiline ? 'top' : 'center'}
      />
      {hint ? <Text style={ui.hint}>{hint}</Text> : null}
    </View>
  );
}

export function SwitchRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View style={ui.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={ui.switchLabel}>{label}</Text>
        {hint ? <Text style={ui.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: COLORS.primary, false: '#D1D5DB' }} />
    </View>
  );
}

export function Button({ label, onPress, loading, disabled, variant = 'primary', icon, style }: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  const look = BUTTONS[variant];
  return (
    <TouchableOpacity
      style={[ui.button, look.box, (disabled || loading) && ui.buttonOff, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color={look.text} /> : (
        <>
          {icon ? <Ionicons name={icon} size={16} color={look.text} /> : null}
          <Text style={[ui.buttonTxt, { color: look.text }]} numberOfLines={1}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const BUTTONS = {
  primary: { box: { backgroundColor: COLORS.primary }, text: '#FFFFFF' },
  secondary: { box: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: COLORS.primary }, text: COLORS.primary },
  danger: { box: { backgroundColor: '#FEE2E2' }, text: '#B91C1C' },
  ghost: { box: { backgroundColor: '#F3F4F6' }, text: '#374151' },
} as const;

export function Empty({ text, icon = 'file-tray-outline' }: { text: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={ui.empty}>
      <Ionicons name={icon} size={34} color="#CBD5E1" />
      <Text style={ui.emptyTxt}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;
}

/** Une feuille de saisie qui monte du bas de l'écran (formulaire d'ajout ou de modification). */
export function Sheet({ visible, title, onClose, children, footer }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={ui.sheetRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={ui.sheetBackdrop} />
        </TouchableWithoutFeedback>
        <View style={[ui.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <View style={ui.sheetHandle} />
          <View style={ui.sheetHead}>
            <Text style={ui.sheetTitle} numberOfLines={2}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.sheetBody}>{children}</ScrollView>
          {footer ? <View style={ui.sheetFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const ui = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, ...adminShadow.card },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6D6D72', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 18, marginBottom: 8, marginHorizontal: 4 },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, ...adminShadow.card },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  chips: { gap: 8, paddingVertical: 4, paddingHorizontal: 2, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipTxtOn: { color: '#FFFFFF' },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB' },
  textarea: { minHeight: 96, paddingTop: 11 },
  hint: { fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, marginBottom: 6 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  buttonOff: { opacity: 0.55 },
  buttonTxt: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTxt: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginBottom: 6 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingVertical: 8 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  sheetBody: { paddingHorizontal: 18, paddingBottom: 12 },
  sheetFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 10 },
});
