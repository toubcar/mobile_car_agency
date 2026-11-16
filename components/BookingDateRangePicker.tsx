import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { COLORS } from '@/constants/api';

import { t, jsLocale } from '@/i18n';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

function normalize(d: Date): Date {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1, 12, 0, 0, 0);
  let offset = first.getDay() - 1;
  if (offset < 0) offset = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d, 12, 0, 0, 0));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type PickerTarget = 'start' | 'end';

type Props = {
  startDate: Date;
  endDate: Date;
  onStartChange: (d: Date) => void;
  onEndChange: (d: Date) => void;
  minStart: Date;
  days: number;
};

export default function BookingDateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  minStart,
  days,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const isCompact = screenW < 360;

  const rs = useMemo(() => {
    const cellSize = Math.floor(Math.min((screenW - 80) / 7, 46));
    return {
      cellSize,
      chipDay: isCompact ? 24 : 28,
      chipPad: isCompact ? 8 : 12,
      middleW: isCompact ? 40 : 48,
      navSize: isCompact ? 34 : 38,
      iconSm: isCompact ? 14 : 16,
      iconMd: isCompact ? 16 : 18,
    };
  }, [screenW, isCompact]);

  const [active, setActive] = useState<PickerTarget>('start');
  const [viewMonth, setViewMonth] = useState(() => ({
    year: startDate.getFullYear(),
    month: startDate.getMonth(),
  }));

  const startChip = formatChip(startDate);
  const endChip = formatChip(endDate);
  const minDate =
    active === 'start'
      ? minStart
      : (() => {
          const d = new Date(startDate);
          d.setDate(d.getDate() + 1);
          return normalize(d);
        })();

  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString(jsLocale(), {
    month: 'long',
    year: 'numeric',
  });

  const grid = useMemo(
    () => buildMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month],
  );

  const canGoPrev = useMemo(() => {
    const prev = new Date(viewMonth.year, viewMonth.month - 1, 1);
    const minM = new Date(minStart.getFullYear(), minStart.getMonth(), 1);
    return prev >= minM;
  }, [viewMonth, minStart]);

  const shiftMonth = (delta: number) => {
    setViewMonth((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const handleDayPress = (day: Date) => {
    if (dayStart(day) < dayStart(minDate)) return;

    const date = normalize(day);
    if (active === 'start') {
      onStartChange(date);
      if (date >= endDate) {
        const newEnd = new Date(date);
        newEnd.setDate(newEnd.getDate() + 1);
        onEndChange(newEnd);
      }
      setActive('end');
    } else {
      if (date <= startDate) return;
      onEndChange(date);
    }
  };

  const isInRange = (day: Date) => {
    const time = dayStart(day);
    return time > dayStart(startDate) && time < dayStart(endDate);
  };

  return (
    <View style={styles.root}>
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, { paddingVertical: rs.chipPad }, active === 'start' && styles.chipActive]}
          onPress={() => {
            setActive('start');
            setViewMonth({ year: startDate.getFullYear(), month: startDate.getMonth() });
          }}
          activeOpacity={0.9}
        >
          <View style={styles.chipLabelRow}>
            <Ionicons
              name="log-in-outline"
              size={rs.iconSm}
              color={active === 'start' ? 'rgba(255,255,255,0.85)' : COLORS.secondary}
            />
            <Text style={[styles.chipLabel, active === 'start' && styles.chipLabelActive]}>{t('Départ')}</Text>
          </View>
          <Text style={[styles.chipDay, { fontSize: rs.chipDay }, active === 'start' && styles.chipDayActive]}>
            {startChip.day}
          </Text>
          <Text style={[styles.chipMeta, active === 'start' && styles.chipMetaActive]}>
            {startChip.month} · {startChip.weekday}
          </Text>
        </TouchableOpacity>

        <View style={[styles.middle, { width: rs.middleW }]}>
          <View style={styles.durationBadge}>
            <Text style={styles.durationTxt}>{days > 0 ? `${days}j` : '—'}</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={isCompact ? 20 : 22} color={COLORS.secondary} />
        </View>

        <TouchableOpacity
          style={[styles.chip, { paddingVertical: rs.chipPad }, active === 'end' && styles.chipActive]}
          onPress={() => {
            setActive('end');
            setViewMonth({ year: endDate.getFullYear(), month: endDate.getMonth() });
          }}
          activeOpacity={0.9}
        >
          <View style={styles.chipLabelRow}>
            <Ionicons
              name="log-out-outline"
              size={rs.iconSm}
              color={active === 'end' ? 'rgba(255,255,255,0.85)' : COLORS.secondary}
            />
            <Text style={[styles.chipLabel, active === 'end' && styles.chipLabelActive]}>{t('Retour')}</Text>
          </View>
          <Text style={[styles.chipDay, { fontSize: rs.chipDay }, active === 'end' && styles.chipDayActive]}>
            {endChip.day}
          </Text>
          <Text style={[styles.chipMeta, active === 'end' && styles.chipMetaActive]}>
            {endChip.month} · {endChip.weekday}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarHeaderTxt} numberOfLines={1}>
            {active === 'start' ? t('Date de départ') : t('Date de retour')}
          </Text>
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={[styles.navBtn, { width: rs.navSize, height: rs.navSize }]}
              onPress={() => shiftMonth(-1)}
              disabled={!canGoPrev}
              activeOpacity={0.75}
            >
              <Ionicons
                name="chevron-back"
                size={rs.iconMd}
                color={canGoPrev ? COLORS.primary : COLORS.border}
              />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, isCompact && styles.monthLabelCompact]} numberOfLines={1}>
              {monthLabel}
            </Text>
            <TouchableOpacity
              style={[styles.navBtn, { width: rs.navSize, height: rs.navSize }]}
              onPress={() => shiftMonth(1)}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-forward" size={rs.iconMd} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[styles.weekday, { width: rs.cellSize }]}>
              {w}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((day, i) => {
            if (!day) {
              return <View key={`e-${i}`} style={{ width: rs.cellSize, height: rs.cellSize }} />;
            }

            const disabled = dayStart(day) < dayStart(minDate);
            const isStart = isSameDay(day, startDate);
            const isEnd = isSameDay(day, endDate);
            const inRange = isInRange(day);
            const selected = isStart || isEnd;

            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayCell,
                  { width: rs.cellSize, height: rs.cellSize },
                  inRange && styles.dayInRange,
                  isStart && styles.dayStart,
                  isEnd && styles.dayEnd,
                ]}
                onPress={() => handleDayPress(day)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dayInner,
                    selected && styles.dayInnerSelected,
                    disabled && styles.dayInnerDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isCompact && styles.dayTextCompact,
                      selected && styles.dayTextSelected,
                      disabled && styles.dayTextDisabled,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Ionicons name="calendar-outline" size={rs.iconSm} color={COLORS.secondary} />
        <Text style={[styles.footerTxt, isCompact && styles.footerTxtCompact]} numberOfLines={2}>
          {formatFrenchDate(startDate)} → {formatFrenchDate(endDate)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 0,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chipLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipLabelActive: { color: 'rgba(255,255,255,0.75)' },
  chipDay: { fontWeight: '800', color: COLORS.primary, lineHeight: 32 },
  chipDayActive: { color: COLORS.white },
  chipMeta: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  chipMetaActive: { color: 'rgba(255,255,255,0.85)' },
  middle: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  durationBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  durationTxt: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  calendarHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  calendarHeaderTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navBtn: {
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  monthLabelCompact: { fontSize: 14 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  weekday: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dayCell: { alignItems: 'center', justifyContent: 'center' },
  dayInRange: { backgroundColor: 'rgba(174,214,241,0.35)' },
  dayStart: { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  dayEnd: { borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  dayInner: {
    width: '82%',
    height: '82%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSelected: { backgroundColor: COLORS.primary },
  dayInnerDisabled: { opacity: 0.35 },
  dayText: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  dayTextCompact: { fontSize: 13 },
  dayTextSelected: { color: COLORS.white, fontWeight: '800' },
  dayTextDisabled: { color: COLORS.gray },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  footerTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
    textAlign: 'center',
  },
  footerTxtCompact: { fontSize: 11 },
});
