import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SalonsStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { colors, spacing, radii, fontSizes } from '../../theme';

type Props = NativeStackScreenProps<SalonsStackParamList, 'BookService'>;

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'];
const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function nextDays(count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function BookServiceScreen({ route, navigation }: Props) {
  const { organizationId, organizationName, serviceId, serviceName, priceCents, durationMinutes } = route.params;
  const { session } = useAuth();
  const days = useMemo(() => nextDays(7), []);
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    if (!selectedTime || !session?.user.id) return;
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledAt = new Date(selectedDay);
    scheduledAt.setHours(hours, minutes, 0, 0);

    setSubmitting(true);
    const { error } = await supabase.from('bookings').insert({
      organization_id: organizationId,
      customer_id: session.user.id,
      service_id: serviceId,
      scheduled_at: scheduledAt.toISOString(),
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('تعذر الحجز', error.message);
      return;
    }
    Alert.alert('تم الحجز', `تم حجز ${serviceName} في ${organizationName}`, [
      { text: 'تمام', onPress: () => navigation.popToTop() },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.serviceName}>{serviceName}</Text>
        <Text style={styles.meta}>{organizationName} · {durationMinutes} دقيقة · {(priceCents / 100).toFixed(0)} دينار</Text>
      </View>

      <Text style={styles.sectionTitle}>اختاري اليوم</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
        {days.map((d) => {
          const active = d.toDateString() === selectedDay.toDateString();
          return (
            <Text
              key={d.toISOString()}
              onPress={() => setSelectedDay(d)}
              style={[styles.dayChip, active && styles.dayChipActive]}
            >
              {DAY_LABELS[d.getDay()]} {d.getDate()}
            </Text>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>اختاري الوقت</Text>
      <View style={styles.timeGrid}>
        {TIME_SLOTS.map((t) => {
          const active = t === selectedTime;
          return (
            <Text key={t} onPress={() => setSelectedTime(t)} style={[styles.timeChip, active && styles.timeChipActive]}>
              {t}
            </Text>
          );
        })}
      </View>

      <Button label="تأكيد الحجز" onPress={confirm} loading={submitting} disabled={!selectedTime} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 4,
  },
  serviceName: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.text, textAlign: 'right' },
  meta: { fontSize: fontSizes.sm, color: colors.textDim, textAlign: 'right' },
  sectionTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text, textAlign: 'right' },
  daysRow: { gap: spacing.sm },
  dayChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.sm,
    color: colors.textDim,
    overflow: 'hidden',
  },
  dayChipActive: { backgroundColor: colors.text, borderColor: colors.text, color: colors.bg, fontWeight: '700' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.sm,
    color: colors.textDim,
    overflow: 'hidden',
  },
  timeChipActive: { backgroundColor: colors.emberBg, borderColor: colors.emberBorder, color: colors.ember, fontWeight: '700' },
});
