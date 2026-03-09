// src/viewmodels/LoginViewModel.ts
import { useState } from 'react';
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

  // ✅ returns result so the screen can show ErrorModal
  const handleLogin = async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    const u = username.trim();
    const p = password;

    if (!u || !p) {
      return {
        ok: false,
        message: 'Veuillez saisir nom d’utilisateur et mot de passe',
      };
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

      return { ok: true };
    } catch (error: any) {
      console.log('DEBUG: Login failed:', error?.message);

      return {
        ok: false,
        message: error?.message || 'Erreur inconnue',
      };
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