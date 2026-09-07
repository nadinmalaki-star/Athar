import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { CustomerFingerprint, FingerprintStatus } from '../../lib/database.types';
import { StatusBadge } from '../../components/StatusBadge';
import { relativeTimeAr, shortReason } from '../../domain/fingerprintCopy';
import { colors, spacing, radii, fontSizes, statusMeta } from '../../theme';

type Props = NativeStackScreenProps<OwnerStackParamList, 'CustomersList'>;

interface Row extends CustomerFingerprint {
  full_name: string;
}

const STATUS_PRIORITY: FingerprintStatus[] = ['follow_up', 'price_blocker', 'wait', 'lost_interest'];
type FilterValue = 'all' | FingerprintStatus;

export function CustomersListScreen({ navigation }: Props) {
  const { organizationId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setError(null);

    const { data: fingerprints, error: fpError } = await supabase
      .from('customer_fingerprints')
      .select('*')
      .eq('organization_id', organizationId);
    if (fpError) {
      setError(fpError.message);
      return;
    }

    const ids = (fingerprints ?? []).map((f) => f.customer_id);
    if (ids.length === 0) {
      setRows([]);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ids);
    if (profileError) {
      setError(profileError.message);
      return;
    }

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const merged = (fingerprints ?? [])
      .map((fp) => ({ ...fp, full_name: nameById.get(fp.customer_id) ?? 'عميلة' }))
      .sort((a, b) => {
        const pa = STATUS_PRIORITY.indexOf(a.status);
        const pb = STATUS_PRIORITY.indexOf(b.status);
        if (pa !== pb) return pa - pb;
        return a.days_since_last_interaction - b.days_since_last_interaction;
      });
    setRows(merged);
  }, [organizationId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const counts = rows.reduce<Record<FilterValue, number>>(
    (acc, r) => {
      acc.all += 1;
      acc[r.status] += 1;
      return acc;
    },
    { all: 0, follow_up: 0, wait: 0, price_blocker: 0, lost_interest: 0 }
  );

  const visibleRows = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <View style={styles.screen}>
      <Text style={styles.subtitle}>الترتيب مبني على نمط حجزها وتصفحها وردودها، مش على تخمين.</Text>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
        data={(['all', ...STATUS_PRIORITY] as FilterValue[])}
        keyExtractor={(v) => v}
        renderItem={({ item }) => (
          <Chip
            value={item}
            count={counts[item]}
            active={filter === item}
            onPress={() => setFilter(item)}
          />
        )}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={visibleRows}
        keyExtractor={(r) => r.customer_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ember} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>ما في عميلات بعد بهاد التصنيف.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('CustomerDetail', { customerId: item.customer_id, customerName: item.full_name })
            }
          >
            <View style={styles.rowTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.full_name.trim().charAt(0)}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.time}>{relativeTimeAr(item.last_interaction_at)}</Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>
            <Text style={styles.reason}>{shortReason(item)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function Chip({
  value,
  count,
  active,
  onPress,
}: {
  value: FilterValue;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const label = value === 'all' ? 'الكل' : statusMeta[value].label;
  const color = value === 'all' ? colors.text : statusMeta[value].color;
  const bg = active ? (value === 'all' ? colors.text : statusMeta[value].bg) : colors.surface;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg, borderColor: active ? color : colors.border }]}
    >
      <Text style={[styles.chipText, { color: active ? (value === 'all' ? colors.bg : color) : colors.textDim }]}>
        {label} {count}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textDim,
    textAlign: 'right',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    lineHeight: 20,
  },
  chipsRow: { flexGrow: 0, marginTop: spacing.lg },
  chipsContent: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: spacing.lg, borderRadius: radii.pill, borderWidth: 1 },
  chipText: { fontSize: fontSizes.sm, fontWeight: '700' },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  empty: { textAlign: 'center', color: colors.textFaint, marginTop: spacing.xxl },
  listContent: { padding: spacing.xl, gap: spacing.md },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: colors.textDim },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, textAlign: 'right' },
  time: { fontSize: fontSizes.xs, color: colors.textFaint, textAlign: 'right' },
  reason: { fontSize: fontSizes.sm, color: colors.textDim, textAlign: 'right', lineHeight: 18 },
});
