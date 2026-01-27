import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LaunchScreen from '../views/LaunchScreen';
import LoginScreen from '../views/LoginScreen';
import WorkOrdersScreen from '../views/WorkOrdersScreen';
import WorkOrderDetailsScreen from '../views/WorkOrderDetailsScreen';
import { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

export type RootStackParamList = {
  Launch: undefined;
  Login: undefined;
  WorkOrders: undefined;
  WorkOrderDetails: { workOrder: WorkOrder };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Launch" component={LaunchScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="WorkOrders" component={WorkOrdersScreen} />
      <Stack.Screen name="WorkOrderDetails" component={WorkOrderDetailsScreen} />
    </Stack.Navigator>
  );
}
