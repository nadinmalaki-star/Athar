import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CustomersStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { CustomerFingerprint, InteractionEvent } from '../../lib/database.types';
import { StatusBadge } from '../../components/StatusBadge';
import { relativeTimeAr, summaryFor, eventLabel } from '../../domain/fingerprintCopy';
import { colors, spacing, radii, fontSizes } from '../../theme';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomerDetail'>;

export function CustomerDetailScreen({ route, navigation }: Props) {
  const { customerId, customerName } = route.params;
  const { organizationId } = useAuth();
  const [fp, setFp] = useState<CustomerFingerprint | null>(null);
  const [events, setEvents] = useState<InteractionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      const [fpResult, eventsResult] = await Promise.all([
        supabase
          .from('customer_fingerprints')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('customer_id', customerId)
          .single(),
        supabase
          .from('interaction_events')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (fpResult.data) setFp(fpResult.data);
      if (eventsResult.data) setEvents(eventsResult.data);
      setLoading(false);
    })();
  }, [organizationId, customerId]);

  if (loading || !fp) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>عم نجهز ملفها...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <StatusBadge status={fp.status} />
        <Text style={styles.summary}>{summaryFor(fp)}</Text>
        <Pressable
          style={styles.explainLink}
          onPress={() => navigation.navigate('Explain', { customerId, customerName })}
        >
          <Text style={styles.explainLinkText}>ليش صنفناها هيك؟ ←</Text>
        </Pressable>
      </View>

      <View style={styles.signalsGrid}>
        <SignalCard title="نمط الحجز" text={`${fp.completed_bookings} جلسة مكتملة، ${fp.open_bookings} حجز معلّق`} />
        <SignalCard title="نمط التصفح" text={`فتحت صفحة السعر ${fp.price_views_14d} مرات خلال أسبوعين`} />
        <SignalCard
          title="نمط التواصل"
          text={fp.avg_response_minutes != null ? `بترد خلال ${Math.round(fp.avg_response_minutes)} دقيقة بالمعدل` : 'ما في بيانات رد كافية بعد'}
        />
        <SignalCard title="آخر تفاعل" text={relativeTimeAr(fp.last_interaction_at)} />
      </View>

      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>خط التفاعل</Text>
        {events.length === 0 ? (
          <Text style={styles.timelineEmpty}>ما في أحداث مسجلة بعد.</Text>
        ) : (
          events.map((e, idx) => (
            <View key={e.id} style={styles.timelineRow}>
              <View style={styles.timelineDotCol}>
                <View style={styles.timelineDot} />
                {idx < events.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineLabel}>{eventLabel(e.event_type)}</Text>
                <Text style={styles.timelineTime}>{relativeTimeAr(e.created_at)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function SignalCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.signalCard}>
      <Text style={styles.signalTitle}>{title}</Text>
      <Text style={styles.signalText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { textAlign: 'center', marginTop: spacing.xxl, color: colors.textDim },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  headerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summary: { fontSize: fontSizes.sm, color: colors.text, textAlign: 'right', lineHeight: 20 },
  explainLink: { alignSelf: 'flex-end', marginTop: spacing.xs },
  explainLinkText: { color: colors.ember, fontSize: fontSizes.sm, fontWeight: '700' },
  signalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  signalCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  signalTitle: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textFaint, textAlign: 'right' },
  signalText: { fontSize: fontSizes.sm, color: colors.text, textAlign: 'right', lineHeight: 18 },
  timelineCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  timelineTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text, textAlign: 'right' },
  timelineEmpty: { color: colors.textFaint, textAlign: 'right', fontSize: fontSizes.sm },
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  timelineDotCol: { alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textDim, marginTop: 5 },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: colors.border, marginTop: 2 },
  timelineBody: { flex: 1, paddingBottom: spacing.md },
  timelineLabel: { fontSize: fontSizes.sm, color: colors.text, textAlign: 'right' },
  timelineTime: { fontSize: fontSizes.xs, color: colors.textFaint, textAlign: 'right', marginTop: 2 },
});
