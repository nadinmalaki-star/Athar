import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, fontSizes } from '../../theme';

export function SignUpCustomerScreen() {
  const { signUpCustomer } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = fullName && email && password.length >= 6;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error: signUpError } = await signUpCustomer({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
    });
    setLoading(false);
    if (signUpError) setError(signUpError);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>بعد ما تنشئي حسابك رح تقدري تتصفحي الصالونات وتحجزي مباشرة.</Text>
        <TextField label="اسمك" value={fullName} onChangeText={setFullName} />
        <TextField
          label="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="إنشاء الحساب" onPress={handleSubmit} loading={loading} disabled={!canSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg },
  hint: { fontSize: fontSizes.sm, color: colors.textDim, textAlign: 'right', lineHeight: 20 },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'right' },
});
