import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { Button } from '../../components/Button';
import { colors, spacing, fontSizes } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Text style={styles.markText}>أ</Text>
          </View>
          <Text style={styles.title}>لوحة الحجوزات</Text>
          <Text style={styles.subtitle}>تطبيق حجوزات لصالونات التجميل — بصمة تفاعل واضحة لكل عميلة، مبنية على سلوكها الفعلي.</Text>
        </View>

        <View style={styles.actions}>
          <Button label="عندي صالون" onPress={() => navigation.navigate('SignUpOwner')} />
          <Button label="أنا عميلة" variant="secondary" onPress={() => navigation.navigate('SignUpCustomer')} />
          <Text style={styles.signInLink} onPress={() => navigation.navigate('SignIn')}>
            عندي حساب مسبقاً — تسجيل الدخول
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'space-between', padding: spacing.xl, paddingVertical: spacing.xxl },
  brand: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl * 2 },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  markText: { color: colors.bg, fontSize: fontSizes.xl, fontWeight: '800' },
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  actions: { gap: spacing.md },
  signInLink: {
    textAlign: 'center',
    color: colors.ember,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
