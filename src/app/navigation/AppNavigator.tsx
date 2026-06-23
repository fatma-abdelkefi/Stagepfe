import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

import LoginScreen from '../../features/auth/screens/LoginScreen';
import LaunchScreen from '../../features/startup/screens/LaunchScreen';
import WorkOrdersScreen from '../../features/workorders/screens/WorkOrdersScreen';
import WorkOrderDetailsScreen from '../../features/workorder-details/screens/WorkOrderDetailsScreen';

import MaterialsListScreen from '../../features/materials/screens/MaterialsListScreen';
import AddPlannedMaterialScreen from '../../features/materials/screens/AddPlannedMaterialScreen';
import AddActualMaterialScreen from '../../features/materials/screens/AddActualMaterialScreen';

import AddPlannedLaborScreen from '../../features/labor/screens/AddPlannedLaborScreen';
import AddActualLaborScreen from '../../features/labor/screens/AddActualLaborScreen';
import DetailsPlannedLaborScreen from '../../features/labor/screens/DetailsPlannedLaborScreen';
import DetailsActualLaborScreen from '../../features/labor/screens/DetailsActualLaborScreen';
import ActivityListScreen from '../../features/activities/screens/ActivityListScreen';
import DoclinksListScreen from '../../features/doclinks/screens/DoclinksListScreen';
import DoclinkDetailsScreen from '../../features/doclinks/screens/DoclinkDetailsScreen';
import AddDoclinkScreen from '../../features/doclinks/screens/AddDoclinkScreen';
import LocalDoclinkImageViewerScreen from '../../features/doclinks/screens/LocalDoclinkImageViewerScreen';
import WorkLogListScreen from '../../features/worklog/screens/WorkLogListScreen';
import WorkLogDetailsScreen from '../../features/worklog/screens/WorkLogDetailsScreen';
import AddWorkLogScreen from '../../features/worklog/screens/AddWorkLogScreen';
import FailureReportingScreen from '../../features/failure-reporting/screens/FailureReportingScreen';
import FailureReportingDetailsScreen from '../../features/failure-reporting/screens/FailureReportingDetailsScreen';
import AddRelatedWorkOrderScreen from '../../features/related-work-orders/screens/AddRelatedWorkOrderScreen';
import RelatedWorkOrdersListScreen from '../../features/related-work-orders/screens/RelatedWorkOrdersListScreen';
import AddWorkOrderScreen from '../../features/add-workorder/screens/AddWorkOrderScreen';

import { useAuth } from '../providers/AuthProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { authLoading, username, password } = useAuth();

  if (authLoading) {
    return <LaunchScreen />;
  }

  const isLoggedIn = !!username && !!password;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="WorkOrders" component={WorkOrdersScreen} />
          <Stack.Screen name="WorkOrderDetails" component={WorkOrderDetailsScreen} />

          <Stack.Screen name="MaterialsList" component={MaterialsListScreen} />
          <Stack.Screen name="AddPlannedMaterial" component={AddPlannedMaterialScreen} />
          <Stack.Screen name="AddActualMaterial" component={AddActualMaterialScreen} />
          <Stack.Screen name="AddRelatedWorkOrder" component={AddRelatedWorkOrderScreen} />

          <Stack.Screen name="AddPlannedLabor" component={AddPlannedLaborScreen} />
          <Stack.Screen name="AddActualLabor" component={AddActualLaborScreen} />
          <Stack.Screen name="DetailsPlannedLabor" component={DetailsPlannedLaborScreen} />
          <Stack.Screen name="DetailsActualLabor" component={DetailsActualLaborScreen} />
          <Stack.Screen name="ActivityList" component={ActivityListScreen} />

          <Stack.Screen
            name="DoclinksList"
            component={DoclinksListScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DoclinkDetails"
            component={DoclinkDetailsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddDoclink"
            component={AddDoclinkScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LocalDoclinkImageViewer"
            component={LocalDoclinkImageViewerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="WorkLogList" component={WorkLogListScreen} />
          <Stack.Screen name="WorkLogDetails" component={WorkLogDetailsScreen} />
          <Stack.Screen name="AddWorkLog" component={AddWorkLogScreen} />
          <Stack.Screen
            name="FailureReporting"
            component={FailureReportingScreen}
          />
          <Stack.Screen
            name="FailureReportingDetails"
            component={FailureReportingDetailsScreen}
          />
          <Stack.Screen
          name="RelatedWorkOrdersList"
          component={RelatedWorkOrdersListScreen}
        />
          <Stack.Screen
          name="AddWorkOrder"
          component={AddWorkOrderScreen}
          options={{
            headerShown: false,
          }}
        />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
        
      )}
    </Stack.Navigator>
  );
}