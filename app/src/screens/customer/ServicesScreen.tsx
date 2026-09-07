import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SalonsStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Service } from '../../lib/database.types';
import { colors, spacing, radii, fontSizes } from '../../theme';

type Props = NativeStackScreenProps<SalonsStackParamList, 'Services'>;

function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(0)} دينار`;
}

export function ServicesScreen({ route, navigation }: Props) {
  const { organizationId, organizationName } = route.params;
  const { session } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setServices(data ?? []);
        setLoading(false);
      });

    // Browsing this salon's services is itself a signal — logged once per
    // screen visit, separately from the per-service "viewed_price" signal
    // logged when she taps into one (see ServicesScreen -> BookService).
    if (session?.user.id) {
      supabase.rpc('log_interaction_event', {
        p_org: organizationId,
        p_customer: session.user.id,
        p_type: 'viewed_service',
      });
    }
  }, [organizationId, session?.user.id]);

  async function openService(service: Service) {
    if (session?.user.id) {
      await supabase.rpc('log_interaction_event', {
        p_org: organizationId,
        p_customer: session.user.id,
        p_type: 'viewed_price',
      });
    }
    navigation.navigate('BookService', {
      organizationId,
      organizationName,
      serviceId: service.id,
      serviceName: service.name,
      priceCents: service.price_cents,
      durationMinutes: service.duration_minutes,
    });
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={services}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>ما في خدمات متاحة حالياً.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openService(item)}>
            <View style={styles.rowInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.duration_minutes} دقيقة</Text>
            </View>
            <Text style={styles.price}>{formatPrice(item.price_cents)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.md },
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
  rowInfo: { gap: 4 },
  name: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, textAlign: 'right' },
  meta: { fontSize: fontSizes.xs, color: colors.textFaint, textAlign: 'right' },
  price: { fontSize: fontSizes.md, fontWeight: '700', color: colors.ember },
});
