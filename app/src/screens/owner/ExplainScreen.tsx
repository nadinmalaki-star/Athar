import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CustomersStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { CustomerFingerprint, FingerprintStatus } from '../../lib/database.types';
import { Button } from '../../components/Button';
import { rulesFor } from '../../domain/fingerprintCopy';
import { colors, spacing, radii, fontSizes, statusMeta } from '../../theme';

type Props = NativeStackScreenProps<CustomersStackParamList, 'Explain'>;

const OVERRIDE_OPTIONS: { label: string; value: FingerprintStatus | 'clear' }[] = [
  { label: 'صح، هاد التصنيف مضبوط', value: 'clear' },
  { label: 'لأ، تابعي معها الآن', value: 'follow_up' },
  { label: 'لأ، فعلاً فقدت الاهتمام', value: 'lost_interest' },
];

export function ExplainScreen({ route }: Props) {
  const { customerId } = route.params;
  const { organizationId } = useAuth();
  const [fp, setFp] = useState<CustomerFingerprint | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    if (!organizationId) return;
    const { data } = await supabase
      .from('customer_fingerprints')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .single();
    if (data) setFp(data);
  }

  useEffect(() => {
    load();
  }, [organizationId, customerId]);

  async function applyOverride(value: FingerprintStatus | 'clear') {
    if (!organizationId) return;
    setSaving(value);
    await supabase
      .from('salon_customers')
      .update({
        status_override: value === 'clear' ? null : value,
        status_override_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId);
    await load();
    setSaving(null);
  }

  if (!fp) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>...</Text>
      </View>
    );
  }

  const { title, rules, note } = rulesFor(fp);
  const meta = statusMeta[fp.status];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.intro}>
        التصنيف مبني على قواعد واضحة من سلوكها بالتطبيق — مش تخمين ولا قراءة نفسية. هاي القواعد يلي انطبقت عليها:
      </Text>

      <View style={styles.rulesList}>
        {rules.map((rule, idx) => (
          <View
            key={idx}
            style={[
              styles.ruleRow,
              { backgroundColor: rule.met ? colors.goodBg : colors.bg, borderColor: rule.met ? 'transparent' : colors.border, borderWidth: rule.met ? 0 : 1 },
            ]}
          >
            <View style={[styles.ruleIcon, { backgroundColor: rule.met ? colors.good : colors.surface, borderColor: rule.met ? 'transparent' : colors.textFaint, borderWidth: rule.met ? 0 : 1.5 }]}>
              <Text style={{ color: rule.met ? colors.surface : colors.textFaint, fontWeight: '700', fontSize: 11 }}>
                {rule.met ? '✓' : '✕'}
              </Text>
            </View>
            <View style={styles.ruleTextCol}>
              <Text style={[styles.ruleText, !rule.met && { color: colors.textDim }]}>{rule.text}</Text>
              <Text style={styles.ruleValue}>{rule.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.noteBox, { backgroundColor: meta.bg, borderColor: meta.border }]}>
        <Text style={[styles.noteText, { color: meta.color }]}>ملاحظة: {note}</Text>
      </View>

      <View style={styles.overrideSection}>
        <Text style={styles.overrideTitle}>شو رأيك بهاد التصنيف؟</Text>
        {fp.status_override ? (
          <Text style={styles.overrideActive}>معدّل يدوياً حالياً — اختاري "صح، هاد التصنيف مضبوط" لإلغاء التعديل.</Text>
        ) : null}
        <View style={styles.overrideButtons}>
          {OVERRIDE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              label={opt.label}
              variant="secondary"
              loading={saving === opt.value}
              disabled={saving !== null}
              onPress={() => applyOverride(opt.value)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { textAlign: 'center', marginTop: spacing.xxl, color: colors.textDim },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text, textAlign: 'right' },
  intro: { fontSize: fontSizes.sm, color: colors.textDim, textAlign: 'right', lineHeight: 20 },
  rulesList: { gap: spacing.sm },
  ruleRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radii.sm },
  ruleIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  ruleTextCol: { flex: 1, gap: 3 },
  ruleText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.text, textAlign: 'right' },
  ruleValue: { fontSize: fontSizes.xs, color: colors.textDim, textAlign: 'right' },
  noteBox: { borderWidth: 1, borderRadius: radii.sm, padding: spacing.md },
  noteText: { fontSize: fontSizes.sm, textAlign: 'right', lineHeight: 20 },
  overrideSection: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg },
  overrideTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, textAlign: 'right' },
  overrideActive: { fontSize: fontSizes.xs, color: colors.amber, textAlign: 'right' },
  overrideButtons: { gap: spacing.sm },
});
