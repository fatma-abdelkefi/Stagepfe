import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';

import { AuthProvider } from './src/app/providers/AuthProvider';
import AppNavigator from './src/app/navigation/AppNavigator';
import { registerNavigateToLogin } from './src/shared/config/maximoClient';
import type { RootStackParamList } from './src/app/navigation/types';

export default function App() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    registerNavigateToLogin(() => {
      navRef.current?.reset({
        index: 0,
        routes: [{ name: 'Login', params: { sessionExpired: true } }],
      });
    });
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer ref={navRef}>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
