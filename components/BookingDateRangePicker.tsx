import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { COLORS } from '@/constants/api';
import {
  addDays,
  atNoon,
  isSameDay,
  monthGrid,
  returnLimit,
  stayIsFree,
  toIsoDate,
  weekdayNames,
} from '@/utils/dates';

import { t, jsLocale, dirIcon, useLocale } from '@/i18n';

export { toIsoDate };

export function formatFrenchDate(d: Date): string {
  return d.toLocaleDateString(jsLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatChip(d: Date) {
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString(jsLocale(), { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString(jsLocale(), { weekday: 'short' }).replace('.', ''),
  };
}

/** "1 jour", "3 jours" — as on the website (a day is a night, the return day is not charged) */
export function daysLabel(days: number): string {
  return days === 1 ? t('1 jour') : t(':count jours', { count: days });
}

const TAKEN_BG = '#FEF2F2';
const TAKEN_TEXT = '#F87171';
const BAND = '#E3EEF8';

type PickerTarget = 'start' | 'end';

type Props = {
  startDate: Date;
  endDate: Date;
  onStartChange: (d: Date) => void;
  onEndChange: (d: Date) => void;
  minStart: Date;
  days: number;
  /** Jours (Y-m-d) où le véhicule ne peut pas être pris : en rouge léger, non cliquables. */
  unavailable?: ReadonlySet<string>;
  /** Les jours pris sont en cours de chargement. */
  loadingAvailability?: boolean;
};

/**
 * Le calendrier d'une location, comme celui du site : un jour est une nuit ; les jours où le véhicule est réservé ou au
 * garage ne peuvent pas être choisis, sauf le premier d'entre eux comme jour de retour (le véhicule est rendu le matin).
 */
export default function BookingDateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  minStart,
  days,
  unavailable,
  loadingAvailability,
}: Props) {
  useLocale(); // redessiné quand la langue change (noms des jours et des mois)
  const taken = useMemo(() => unavailable ?? new Set<string>(), [unavailable]);
  const hasAvailability = unavailable !== undefined;

  const [gridWidth, setGridWidth] = useState(0);
  const [active, setActive] = useState<PickerTarget>('start');
  const [viewMonth, setViewMonth] = useState(() => ({ year: startDate.getFullYear(), month: startDate.getMonth() }));

  const cellW = gridWidth > 0 ? gridWidth / 7 : 44;
  const cellH = Math.max(42, Math.min(54, cellW));
  const circle = Math.min(cellW, cellH) - 6;

  const weekdays = useMemo(() => weekdayNames(jsLocale()), []);
  const grid = useMemo(() => monthGrid(viewMonth.year, viewMonth.month), [viewMonth.year, viewMonth.month]);
  const limit = useMemo(() => (active === 'end' ? returnLimit(startDate, taken) : null), [active, startDate, taken]);
  const min = atNoon(minStart);

  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1, 12).toLocaleDateString(jsLocale(), { month: 'long', year: 'numeric' });
  const canGoPrev = new Date(viewMonth.year, viewMonth.month, 1) > new Date(min.getFullYear(), min.getMonth(), 1);

  const shiftMonth = (delta: number) => {
    setViewMonth((v) => {
      const d = new Date(v.year, v.month + delta, 1, 12);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const pickStart = (day: Date) => {
    onStartChange(day);
    // the stay keeps its end when it is still possible, else it becomes one night (always possible)
    if (endDate <= day || !stayIsFree(day, endDate, taken)) {
      onEndChange(addDays(day, 1));
    }
    setActive('end');
  };

  const dayState = (day: Date) => {
    const iso = toIsoDate(day);
    const past = day < min;
    const isTaken = taken.has(iso);
    const choosingEnd = active === 'end';
    const returnDay = choosingEnd && limit !== null && isSameDay(day, limit);
    const beforeStart = choosingEnd && day <= startDate;
    const tooFar = choosingEnd && limit !== null && day > limit;

    let disabled: boolean;
    if (!choosingEnd) {
      disabled = past || isTaken;
    } else {
      // an earlier day than the start begins the stay again; a later one ends it, up to the return day
      disabled = past || (beforeStart ? isTaken || isSameDay(day, startDate) : (isTaken && !returnDay) || tooFar);
    }

    return { past, taken: isTaken && !returnDay, returnDay, blocked: tooFar && !isTaken, disabled };
  };

  const handleDayPress = (day: Date) => {
    if (dayState(day).disabled) return;

    if (active === 'start' || day < startDate) {
      pickStart(day);
      return;
    }
    onEndChange(day);
  };

  const today = atNoon(new Date());
  const startChip = formatChip(startDate);
  const endChip = formatChip(endDate);

  return (
    <View style={styles.root}>
      <View style={styles.chipsRow}>
        <DateChip
          label={t('Départ')}
          icon="log-in-outline"
          chip={startChip}
          active={active === 'start'}
          onPress={() => {
            setActive('start');
            setViewMonth({ year: startDate.getFullYear(), month: startDate.getMonth() });
          }}
        />
        <View style={styles.middle}>
          <View style={styles.durationBadge}>
            <Text style={styles.durationTxt}>{days > 0 ? daysLabel(days) : '—'}</Text>
          </View>
          <Ionicons name={dirIcon('arrow-forward')} size={18} color={COLORS.secondary} />
        </View>
        <DateChip
          label={t('Retour')}
          icon="log-out-outline"
          chip={endChip}
          active={active === 'end'}
          onPress={() => {
            setActive('end');
            setViewMonth({ year: endDate.getFullYear(), month: endDate.getMonth() });
          }}
        />
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={[styles.navBtn, !canGoPrev && styles.navBtnOff]}
            onPress={() => shiftMonth(-1)}
            disabled={!canGoPrev}
            activeOpacity={0.75}
            accessibilityLabel={t('Mois précédent')}
          >
            <Ionicons name={dirIcon('chevron-back')} size={20} color={canGoPrev ? COLORS.primary : '#CBD5E1'} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.monthLabel} numberOfLines={1}>{monthLabel}</Text>
            <Text style={styles.hint} numberOfLines={1}>
              {loadingAvailability ? t('Chargement des disponibilités…') : active === 'start' ? t('Choisissez le jour de départ') : t('Choisissez le jour de retour')}
            </Text>
          </View>
          <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)} activeOpacity={0.75} accessibilityLabel={t('Mois suivant')}>
            <Ionicons name={dirIcon('chevron-forward')} size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {weekdays.map((w, i) => (
            <Text key={`${w}-${i}`} style={[styles.weekday, { width: cellW }]} numberOfLines={1}>
              {w}
            </Text>
          ))}
        </View>

        <View style={styles.grid} onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}>
          {grid.map((day, i) => {
            if (!day) {
              return <View key={`e-${i}`} style={{ width: cellW, height: cellH }} />;
            }

            const state = dayState(day);
            const isStart = isSameDay(day, startDate);
            const isEnd = isSameDay(day, endDate);
            const selected = isStart || isEnd;
            const inRange = day > startDate && day < endDate;
            const hasRange = endDate > startDate;
            const label = day.toLocaleDateString(jsLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
              + (state.taken ? ` — ${t('Indisponible')}` : state.returnDay ? ` — ${t('Retour possible ce jour-là')}` : '');

            return (
              <TouchableOpacity
                key={toIsoDate(day)}
                style={{ width: cellW, height: cellH, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => handleDayPress(day)}
                disabled={state.disabled}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: state.disabled, selected }}
              >
                {inRange ? <View style={[styles.band, styles.bandFull]} /> : null}
                {isStart && hasRange ? <View style={[styles.band, styles.bandToEnd]} /> : null}
                {isEnd && hasRange ? <View style={[styles.band, styles.bandToStart]} /> : null}
                <View
                  style={[
                    styles.circle,
                    { width: circle, height: circle, borderRadius: circle / 2 },
                    state.taken && styles.circleTaken,
                    state.returnDay && !selected && styles.circleReturn,
                    selected && styles.circleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      (state.past || state.blocked) && styles.dayTextMuted,
                      state.taken && styles.dayTextTaken,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {isSameDay(day, today) && !selected ? <View style={styles.todayDot} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendTxt}>{t('Votre sélection')}</Text>
          </View>
          {hasAvailability ? (
            <View style={styles.legendItem}>
              <View style={[styles.swatch, styles.swatchTaken]} />
              <Text style={styles.legendTxt}>{t('Indisponible')}</Text>
            </View>
          ) : null}
          {loadingAvailability ? <ActivityIndicator size="small" color={COLORS.secondary} /> : null}
        </View>
      </View>

      <View style={styles.footer}>
        <Ionicons name="calendar-outline" size={16} color={COLORS.secondary} />
        <Text style={styles.footerTxt} numberOfLines={2}>
          {formatFrenchDate(startDate)} → {formatFrenchDate(endDate)}
        </Text>
      </View>
    </View>
  );
}

function DateChip({ label, icon, chip, active, onPress }: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  chip: { day: string; month: string; weekday: string };
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.9} accessibilityState={{ selected: active }}>
      <View style={styles.chipLabelRow}>
        <Ionicons name={icon} size={14} color={active ? 'rgba(255,255,255,0.85)' : COLORS.secondary} />
        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
      </View>
      <Text style={[styles.chipDay, active && styles.chipDayActive]}>{chip.day}</Text>
      <Text style={[styles.chipMeta, active && styles.chipMetaActive]} numberOfLines={1}>
        {chip.weekday} · {chip.month}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  chipLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  chipLabel: { fontSize: 11, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipLabelActive: { color: 'rgba(255,255,255,0.8)' },
  chipDay: { fontSize: 30, fontWeight: '800', color: COLORS.primary, lineHeight: 36 },
  chipDayActive: { color: COLORS.white },
  chipMeta: { fontSize: 12, fontWeight: '600', color: COLORS.secondary, textTransform: 'capitalize' },
  chipMetaActive: { color: 'rgba(255,255,255,0.88)' },
  middle: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  durationBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  durationTxt: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingTop: 12, paddingBottom: 6 },
  headerCenter: { flex: 1, alignItems: 'center', minWidth: 0 },
  monthLabel: { fontSize: 18, fontWeight: '800', color: COLORS.primary, textTransform: 'capitalize' },
  hint: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnOff: { backgroundColor: '#F8FAFC' },
  weekRow: { flexDirection: 'row', paddingTop: 8, paddingBottom: 4 },
  weekday: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  band: { position: 'absolute', top: 4, bottom: 4, backgroundColor: BAND },
  bandFull: { start: 0, end: 0 },
  bandToEnd: { start: '50%', end: 0 },
  bandToStart: { start: 0, end: '50%' },
  circle: { alignItems: 'center', justifyContent: 'center' },
  circleSelected: { backgroundColor: COLORS.primary },
  circleTaken: { backgroundColor: TAKEN_BG },
  circleReturn: { borderWidth: 1.5, borderColor: '#FCA5A5', borderStyle: 'dashed' },
  dayText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  dayTextMuted: { color: '#CBD5E1' },
  dayTextTaken: { color: TAKEN_TEXT, textDecorationLine: 'line-through' },
  dayTextSelected: { color: COLORS.white, fontWeight: '800' },
  todayDot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.secondary },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, paddingHorizontal: 8, paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  swatchTaken: { backgroundColor: TAKEN_BG, borderWidth: 1, borderColor: '#FCA5A5' },
  legendTxt: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerTxt: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: COLORS.secondary, textAlign: 'center' },
});
