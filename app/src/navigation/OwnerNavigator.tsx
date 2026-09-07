import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { CustomersStackParamList, OwnerTabParamList } from './types';
import { CustomersListScreen } from '../screens/owner/CustomersListScreen';
import { CustomerDetailScreen } from '../screens/owner/CustomerDetailScreen';
import { ExplainScreen } from '../screens/owner/ExplainScreen';
import { CalendarScreen } from '../screens/owner/CalendarScreen';
import { colors } from '../theme';

const CustomersStack = createNativeStackNavigator<CustomersStackParamList>();
const Tab = createBottomTabNavigator<OwnerTabParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
  headerBackTitle: '',
  contentStyle: { backgroundColor: colors.bg },
};

function CustomersStackNavigator() {
  return (
    <CustomersStack.Navigator screenOptions={stackScreenOptions}>
      <CustomersStack.Screen name="CustomersList" component={CustomersListScreen} options={{ title: 'العميلات' }} />
      <CustomersStack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={({ route }) => ({ title: route.params.customerName })}
      />
      <CustomersStack.Screen name="Explain" component={ExplainScreen} options={{ title: 'ليش هيك التصنيف؟' }} />
    </CustomersStack.Navigator>
  );
}

export function OwnerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ember,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen name="CustomersTab" component={CustomersStackNavigator} options={{ title: 'العميلات' }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ title: 'الكاليندر' }} />
    </Tab.Navigator>
  );
}
