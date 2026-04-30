import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/app/navigation/AppNavigator';
import { AuthProvider } from './src/app/providers/AuthProvider';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}