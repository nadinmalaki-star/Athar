import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radii, fontSizes } from '../../theme';

type ViewMode = 'day' | 'month' | 'year';

interface BookingRow {
  id: string;
  scheduled_at: string;
  status: string;
  customer: { full_name: string } | null;
  service: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
  completed: 'تم',
  cancelled: 'ملغي',
};

const DAY_NAMES = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTH_NAMES = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}
function addYears(d: Date, n: number) {
  return new Date(d.getFullYear() + n, 0, 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Weeks grid for a month: leading/trailing days from adjacent months fill
// the first and last rows so the grid is always a clean multiple of 7.
function monthGrid(monthStart: Date): Date[] {
  const firstWeekday = monthStart.getDay(); // 0 = Sunday
  const gridStart = addDays(monthStart, -firstWeekday);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function CalendarScreen() {
  const { organizationId } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [focusDate, setFocusDate] = useState(() => startOfDay(new Date()));
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    if (viewMode === 'day') return { from: startOfDay(focusDate), to: addDays(startOfDay(focusDate), 1) };
    if (viewMode === 'month') return { from: startOfMonth(focusDate), to: addMonths(startOfMonth(focusDate), 1) };
    return { from: startOfYear(focusDate), to: addYears(startOfYear(focusDate), 1) };
  }, [viewMode, focusDate]);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('id, scheduled_at, status, customer:profiles(full_name), service:services(name)')
      .eq('organization_id', organizationId)
      .gte('scheduled_at', range.from.toISOString())
      .lt('scheduled_at', range.to.toISOString())
      .order('scheduled_at', { ascending: true });
    setBookings((data as unknown as BookingRow[]) ?? []);
    setLoading(false);
  }, [organizationId, range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  function shiftFocus(delta: number) {
    if (viewMode === 'day') setFocusDate((d) => addDays(d, delta));
    else if (viewMode === 'month') setFocusDate((d) => addMonths(d, delta));
    else setFocusDate((d) => addYears(d, delta));
  }

  const headerLabel =
    viewMode === 'day'
      ? focusDate.toLocaleDateString('ar-JO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : viewMode === 'month'
        ? `${MONTH_NAMES[focusDate.getMonth()]} ${focusDate.getFullYear()}`
        : `${focusDate.getFullYear()}`;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.title}>الكاليندر</Text>
        <View style={styles.modeRow}>
          {(['day', 'month', 'year'] as ViewMode[]).map((m) => (
            <Pressable key={m} onPress={() => setViewMode(m)} style={[styles.modeChip, viewMode === m && styles.modeChipActive]}>
              <Text style={[styles.modeChipText, viewMode === m && styles.modeChipTextActive]}>
                {m === 'day' ? 'يوم' : m === 'month' ? 'شهر' : 'سنة'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.nav}>
        {/* RTL row: this renders on-screen right, so it's "previous" (earlier), pointing right */}
        <Pressable onPress={() => shiftFocus(-1)} hitSlop={10}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
        <Text style={styles.navLabel}>{headerLabel}</Text>
        {/* renders on-screen left, so it's "next" (later), pointing left */}
        <Pressable onPress={() => shiftFocus(1)} hitSlop={10}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
      </View>

      {viewMode === 'day' && <DayView bookings={bookings} loading={loading} />}
      {viewMode === 'month' && (
        <MonthView
          monthStart={startOfMonth(focusDate)}
          bookings={bookings}
          onPickDay={(d) => {
            setFocusDate(d);
            setViewMode('day');
          }}
        />
      )}
      {viewMode === 'year' && (
        <YearView
          year={focusDate.getFullYear()}
          bookings={bookings}
          onPickMonth={(m) => {
            setFocusDate(new Date(focusDate.getFullYear(), m, 1));
            setViewMode('month');
          }}
        />
      )}
    </View>
  );
}

function DayView({ bookings, loading }: { bookings: BookingRow[]; loading: boolean }) {
  return (
    <FlatList
      data={bookings}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.dayListContent}
      ListEmptyComponent={!loading ? <Text style={styles.empty}>ما في حجوزات هالليوم.</Text> : null}
      renderItem={({ item }) => (
        <View style={styles.dayRow}>
          <Text style={styles.dayTime}>
            {new Date(item.scheduled_at).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.dayInfo}>
            <Text style={styles.dayCustomer}>{item.customer?.full_name ?? 'عميلة'}</Text>
            <Text style={styles.dayService}>{item.service?.name ?? 'خدمة'}</Text>
          </View>
          <Text style={styles.dayStatus}>{STATUS_LABELS[item.status] ?? item.status}</Text>
        </View>
      )}
    />
  );
}

function MonthView({
  monthStart,
  bookings,
  onPickDay,
}: {
  monthStart: Date;
  bookings: BookingRow[];
  onPickDay: (d: Date) => void;
}) {
  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const key = dateKey(new Date(b.scheduled_at));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  const grid = useMemo(() => monthGrid(monthStart), [monthStart]);
  const today = startOfDay(new Date());

  return (
    <View style={styles.monthWrap}>
      <View style={styles.weekHeaderRow}>
        {DAY_NAMES.map((n) => (
          <Text key={n} style={styles.weekHeaderCell}>{n.slice(0, 2)}</Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {grid.map((d) => {
          const inMonth = d.getMonth() === monthStart.getMonth();
          const count = countsByDay.get(dateKey(d)) ?? 0;
          return (
            <Pressable key={d.toISOString()} style={styles.monthCell} onPress={() => onPickDay(d)}>
              <Text style={[styles.monthCellText, !inMonth && styles.monthCellTextDim, sameDay(d, today) && styles.monthCellTextToday]}>
                {d.getDate()}
              </Text>
              {count > 0 && <View style={styles.monthDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function YearView({
  year,
  bookings,
  onPickMonth,
}: {
  year: number;
  bookings: BookingRow[];
  onPickMonth: (monthIndex: number) => void;
}) {
  const countsByMonth = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const b of bookings) counts[new Date(b.scheduled_at).getMonth()] += 1;
    return counts;
  }, [bookings]);

  return (
    <ScrollView contentContainerStyle={styles.yearGrid}>
      {MONTH_NAMES.map((name, i) => (
        <Pressable key={name} style={styles.yearCell} onPress={() => onPickMonth(i)}>
          <Text style={styles.yearCellTitle}>{name}</Text>
          <Text style={styles.yearCellCount}>{countsByMonth[i]} حجز</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xxl },
  topBar: { paddingHorizontal: spacing.xl, gap: spacing.md },
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text, textAlign: 'right' },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeChip: { flex: 1, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modeChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  modeChipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textDim },
  modeChipTextActive: { color: colors.bg },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  navArrow: { fontSize: 22, color: colors.textDim, paddingHorizontal: spacing.sm },
  navLabel: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },

  empty: { textAlign: 'center', color: colors.textFaint, marginTop: spacing.xxl },
  dayListContent: { padding: spacing.xl, paddingTop: 0, gap: spacing.md },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  dayTime: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.ember, minWidth: 52 },
  dayInfo: { flex: 1, gap: 2 },
  dayCustomer: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, textAlign: 'right' },
  dayService: { fontSize: fontSizes.xs, color: colors.textDim, textAlign: 'right' },
  dayStatus: { fontSize: fontSizes.xs, color: colors.textFaint },

  monthWrap: { paddingHorizontal: spacing.xl },
  weekHeaderRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekHeaderCell: { flex: 1, textAlign: 'center', fontSize: fontSizes.xs, color: colors.textFaint, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  monthCellText: { fontSize: fontSizes.sm, color: colors.text },
  monthCellTextDim: { color: colors.textFaint },
  monthCellTextToday: { color: colors.ember, fontWeight: '800' },
  monthDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ember },

  yearGrid: { padding: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  yearCell: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: 6,
  },
  yearCellTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, textAlign: 'right' },
  yearCellCount: { fontSize: fontSizes.xs, color: colors.textDim, textAlign: 'right' },
});
