import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radii, fontSizes } from '../../theme';

interface BookingRow {
  id: string;
  status: string;
  scheduled_at: string;
  services: { name: string; price_cents: number } | null;
  organizations: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
  completed: 'تم',
  cancelled: 'ملغي',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ar-JO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export function MyBookingsScreen() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('bookings')
      .select('id, status, scheduled_at, services(name, price_cents), organizations(name)')
      .eq('customer_id', session.user.id)
      .order('scheduled_at', { ascending: false });
    setBookings((data as unknown as BookingRow[]) ?? []);
  }, [session?.user.id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>حجوزاتي</Text>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ember} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>ما في حجوزات بعد.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.service}>{item.services?.name ?? 'خدمة'}</Text>
              <Text style={styles.salon}>{item.organizations?.name ?? ''}</Text>
              <Text style={styles.time}>{formatDateTime(item.scheduled_at)}</Text>
            </View>
            <Text style={styles.status}>{STATUS_LABELS[item.status] ?? item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xxl },
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text, textAlign: 'right', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  content: { padding: spacing.xl, paddingTop: 0, gap: spacing.md },
  empty: { textAlign: 'center', color: colors.textFaint, marginTop: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  rowInfo: { gap: 3 },
  service: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, textAlign: 'right' },
  salon: { fontSize: fontSizes.xs, color: colors.textDim, textAlign: 'right' },
  time: { fontSize: fontSizes.xs, color: colors.textFaint, textAlign: 'right', marginTop: 2 },
  status: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.ember },
});
