import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { statusMeta, type FingerprintStatus, radii, spacing, fontSizes } from '../theme';

export function StatusBadge({ status, size = 'md' }: { status: FingerprintStatus; size?: 'sm' | 'md' }) {
  const meta = statusMeta[status];
  const compact = size === 'sm';
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: meta.bg, borderColor: meta.border },
        compact && styles.pillCompact,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color }, compact && styles.labelCompact]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillCompact: {
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: fontSizes.xs,
  },
});
