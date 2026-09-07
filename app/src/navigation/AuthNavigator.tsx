import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpOwnerScreen } from '../screens/auth/SignUpOwnerScreen';
import { SignUpCustomerScreen } from '../screens/auth/SignUpCustomerScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: '',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'تسجيل الدخول' }} />
      <Stack.Screen name="SignUpOwner" component={SignUpOwnerScreen} options={{ title: 'حساب صالون' }} />
      <Stack.Screen name="SignUpCustomer" component={SignUpCustomerScreen} options={{ title: 'حساب عميلة' }} />
    </Stack.Navigator>
  );
}
