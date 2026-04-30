import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import { loginRequest } from '../services/authService';
import { useAuth } from '../../../app/providers/AuthProvider';
import type { LoginResult } from '../types/auth.types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function useLoginViewModel() {
  const navigation = useNavigation<NavigationProp>();
  const { setSession } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);

  const togglePasswordVisibility = () => {
    setSecurePassword(prev => !prev);
  };

  const handleLogin = async (): Promise<LoginResult> => {
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

      await loginRequest(u, p);

      await setSession({
        username: u,
        password: p,
      });

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'WorkOrders',
            params: {
              showPermissionsModal: true,
            },
          },
        ],
      });

      return { ok: true };
    } catch (error: any) {
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