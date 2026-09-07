import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OwnerStackParamList } from './types';
import { CustomersListScreen } from '../screens/owner/CustomersListScreen';
import { CustomerDetailScreen } from '../screens/owner/CustomerDetailScreen';
import { ExplainScreen } from '../screens/owner/ExplainScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<OwnerStackParamList>();

export function OwnerNavigator() {
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
      <Stack.Screen name="CustomersList" component={CustomersListScreen} options={{ title: 'العميلات' }} />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={({ route }) => ({ title: route.params.customerName })}
      />
      <Stack.Screen name="Explain" component={ExplainScreen} options={{ title: 'ليش هيك التصنيف؟' }} />
    </Stack.Navigator>
  );
}
