
// src/viewmodels/LoginViewModel.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { login } from '../services/authService';

type LoginScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function useLoginViewModel(navigation: LoginScreenNavigationProp) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);

  const togglePasswordVisibility = () => {
    setSecurePassword(prev => !prev);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez saisir nom d’utilisateur et mot de passe');
      return;
    }

    try {
      setLoading(true);
      console.log('DEBUG: handleLogin called with:', username, password);
      const result = await login(username, password);
      console.log('DEBUG: Login successful:', result);
      navigation.replace('WorkOrders');
    } catch (error: any) {
      console.log('DEBUG: Login failed:', error.message);
      Alert.alert('Échec de connexion', error.message);
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
