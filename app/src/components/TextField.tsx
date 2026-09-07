import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing, fontSizes } from '../theme';

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { writingDirection: 'rtl' }, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs + 2,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: fontSizes.md,
    color: colors.text,
    textAlign: 'right',
  },
});
