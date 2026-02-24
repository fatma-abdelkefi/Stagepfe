// src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';

import LaunchScreen from '../views/LaunchScreen';
import LoginScreen from '../views/LoginScreen';
import WorkOrdersScreen from '../views/WorkOrdersScreen';
import WorkOrderDetailsScreen from '../views/WorkOrderDetailsScreen';

// Detail screens
import DetailsActivitiesScreen from '../views/DetailsActivitiesScreen';
import DetailsLaborScreen from '../views/DetailsLaborScreen';
import DetailsMaterialsScreen from '../views/DetailsMaterialsScreen';
import DetailsDocumentsScreen from '../views/DetailsDocumentsScreen';
import DocDetailsScreen from '../views/DocDetailsScreen';
import DocViewerScreen from '../views/DocViewerScreen';
import DetailsActualLaborScreen from '../views/DetailsActualLaborScreen';
import DetailsActualMaterialsScreen from '../views/DetailsActualMaterialsScreen';
import DetailsWorkLogScreen from '../views/DetailsWorkLogScreen';

// Add screens
import AddMaterialScreen from '../views/AddMaterialScreen';
import AddLaborScreen from '../views/AddLaborScreen';
import AddDoclinkScreen from '../views/AddDoclinkScreen';
import AddActualMaterialScreen from '../views/AddActualMaterialScreen';
import AddActualLaborScreen from '../views/AddActualLaborScreen';
import AddWorkLogScreen from '../views/AddWorkLogScreen';

import type { WorkOrder } from '../viewmodels/WorkOrdersViewModel';
import { useAuth } from '../context/AuthContext';

export type RootStackParamList = {
  Launch: undefined;
  Login: undefined;

  WorkOrders: undefined;
  WorkOrderDetails: { workOrder: WorkOrder };

  // Category detail screens
  DetailsActivities: { workOrder: WorkOrder };
  DetailsLabor: { workOrder: WorkOrder };
  DetailsMaterials: { workOrder: WorkOrder };
  DetailsDocuments: { workOrder: WorkOrder };

  // ✅ Better: keep same WorkOrder type everywhere
  DetailsActualLabor: { workOrder: WorkOrder };
  DetailsActualMaterials: { workOrder: WorkOrder };

  // Documents screens
  DocDetails: { document: any };
  DocViewer: { document: any };

  // Add screens
  AddLabor: {
    workorderid: number;
    siteid: string;
    onSuccess?: () => void;
    onRefresh?: () => void;
  };

  AddMaterial: {
    wonum: string;
    workorderid?: number;
    siteid?: string;
    status?: string;
    ishistory?: boolean;
  };

  AddDoclink: {
    ownerid: number;
    siteid: string;
  };

  // ✅ Actuals add screens
  AddActualMaterial: { woHref: string; wonum: string; siteid: string };
  AddActualLabor: { woHref: string; wonum: string; siteid: string };

  DetailsWorkLog: { workOrder: WorkOrder };

  AddWorkLog: {
    wonum: string;
    siteid?: string;
    workorderid?: number | string;
    mxwoDetailsHref?: string;
    worklogCollectionRef?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' }}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={{ marginTop: 12, color: '#93c5fd', fontWeight: '600' }}>Chargement...</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { username, password, authLoading } = useAuth();
  const isLoggedIn = !!username && !!password;

  if (authLoading) return <Splash />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Launch">
      <Stack.Screen name="Launch" component={LaunchScreen} />

      {isLoggedIn ? (
        <>
          <Stack.Screen name="WorkOrders" component={WorkOrdersScreen} />
          <Stack.Screen name="WorkOrderDetails" component={WorkOrderDetailsScreen} />

          <Stack.Screen name="DetailsActivities" component={DetailsActivitiesScreen} />
          <Stack.Screen name="DetailsLabor" component={DetailsLaborScreen} />
          <Stack.Screen name="DetailsMaterials" component={DetailsMaterialsScreen} />
          <Stack.Screen name="DetailsDocuments" component={DetailsDocumentsScreen} />
          <Stack.Screen name="DetailsActualLabor" component={DetailsActualLaborScreen} />
          <Stack.Screen name="DetailsActualMaterials" component={DetailsActualMaterialsScreen} />

          <Stack.Screen name="DocDetails" component={DocDetailsScreen} />
          <Stack.Screen name="DocViewer" component={DocViewerScreen} />

          <Stack.Screen name="AddLabor" component={AddLaborScreen} />
          <Stack.Screen name="AddMaterial" component={AddMaterialScreen} />
          <Stack.Screen name="AddDoclink" component={AddDoclinkScreen} />
          <Stack.Screen name="AddActualMaterial" component={AddActualMaterialScreen} />
          <Stack.Screen name="AddActualLabor" component={AddActualLaborScreen} />

          <Stack.Screen name="DetailsWorkLog" component={DetailsWorkLogScreen} options={{ title: 'Work log' }} />
          <Stack.Screen name="AddWorkLog" component={AddWorkLogScreen} options={{ title: 'Ajouter Work log' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}