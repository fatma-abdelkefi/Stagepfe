import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LaunchScreen from '../views/LaunchScreen';
import LoginScreen from '../views/LoginScreen';
import WorkOrdersScreen from '../views/WorkOrdersScreen';
import WorkOrderDetailsScreen from '../views/WorkOrderDetailsScreen';
import AddMaterial from '../views/AddMaterialScreen'; 
import AddLaborScreen from '../views/AddLaborScreen';   // ✅ Ajouté
import { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

export type RootStackParamList = {
  Launch: undefined;
  Login: undefined;
  WorkOrders: undefined;
  WorkOrderDetails: { workOrder: WorkOrder };
  AddItem: { category: string; wonum: string };
  AddLabor: {workOrderId: string; site: string ; onSuccess?: () => void; onRefresh?: () => void };    
  AddMaterial: { wonum: string };
  AddActivity: { wonum: string };
  AddDocument: { wonum: string };
  onRefresh?: () => void; 
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Launch" component={LaunchScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="WorkOrders" component={WorkOrdersScreen} />
      <Stack.Screen name="WorkOrderDetails" component={WorkOrderDetailsScreen} />
      
      {/* Ajouter Labor */}
      <Stack.Screen
        name="AddLabor"
        component={AddLaborScreen} // ✅ nouvel écran
        options={{ title: 'Ajouter Main d\'œuvre' }}
      />

      {/* Material déjà présent */}
      <Stack.Screen
        name="AddMaterial"
        component={AddMaterial}
        options={{ title: 'Ajouter Matériel' }}
      />
    </Stack.Navigator>
  );
}
