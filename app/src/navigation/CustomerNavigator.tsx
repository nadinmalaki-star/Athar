import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { CustomerTabParamList, SalonsStackParamList } from './types';
import { SalonListScreen } from '../screens/customer/SalonListScreen';
import { ServicesScreen } from '../screens/customer/ServicesScreen';
import { BookServiceScreen } from '../screens/customer/BookServiceScreen';
import { MyBookingsScreen } from '../screens/customer/MyBookingsScreen';
import { colors } from '../theme';

const SalonsStack = createNativeStackNavigator<SalonsStackParamList>();
const Tab = createBottomTabNavigator<CustomerTabParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
  headerBackTitle: '',
  contentStyle: { backgroundColor: colors.bg },
};

function SalonsStackNavigator() {
  return (
    <SalonsStack.Navigator screenOptions={stackScreenOptions}>
      <SalonsStack.Screen name="SalonList" component={SalonListScreen} options={{ title: 'الصالونات' }} />
      <SalonsStack.Screen
        name="Services"
        component={ServicesScreen}
        options={({ route }) => ({ title: route.params.organizationName })}
      />
      <SalonsStack.Screen name="BookService" component={BookServiceScreen} options={{ title: 'تأكيد الحجز' }} />
    </SalonsStack.Navigator>
  );
}

export function CustomerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ember,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen name="SalonsTab" component={SalonsStackNavigator} options={{ title: 'الصالونات' }} />
      <Tab.Screen name="MyBookingsTab" component={MyBookingsScreen} options={{ title: 'حجوزاتي' }} />
    </Tab.Navigator>
  );
}
