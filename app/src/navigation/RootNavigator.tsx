import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { OwnerNavigator } from './OwnerNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { colors } from '../theme';

export function RootNavigator() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ember} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session || !profile ? (
        <AuthNavigator />
      ) : profile.role === 'owner' ? (
        <OwnerNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
}
