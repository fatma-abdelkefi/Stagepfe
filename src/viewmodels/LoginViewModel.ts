// src/viewmodels/LoginViewModel.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { login } from '../services/authService';
import { useAuth } from '../context/AuthContext';

type LoginScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function useLoginViewModel(navigation: LoginScreenNavigationProp) {
  const { setCredentials } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);

  const togglePasswordVisibility = () => {
    setSecurePassword(prev => !prev);
  };

  const handleLogin = async () => {
    const u = username.trim();
    const p = password;

    if (!u || !p) {
      Alert.alert('Erreur', 'Veuillez saisir nom d’utilisateur et mot de passe');
      return;
    }

    try {
      setLoading(true);

      console.log('DEBUG: handleLogin called with:', u);

      // 1) authenticate (your backend)
      const result = await login(u, p);
      console.log('DEBUG: Login successful:', result);

      // 2) ✅ persist credentials in context + AsyncStorage
      await setCredentials(u, p);

      // 3) ✅ reset navigation to WorkOrders
      navigation.reset({
        index: 0,
        routes: [{ name: 'WorkOrders' }],
      });

    } catch (error: any) {
      console.log('DEBUG: Login failed:', error?.message);
      Alert.alert('Échec de connexion', error?.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    securePassword,
    togglePasswordVisibility,
    handleLogin,
    loading,
  };
}