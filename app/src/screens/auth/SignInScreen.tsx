import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { colors, spacing, fontSizes } from '../../theme';

export function SignInScreen() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (signInError) setError(signInError);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          textContentType="password"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="تسجيل الدخول" onPress={handleSubmit} loading={loading} disabled={!email || !password} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg },
  error: { color: colors.danger, fontSize: fontSizes.sm, textAlign: 'right' },
});
