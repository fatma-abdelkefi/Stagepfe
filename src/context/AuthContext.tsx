// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  username: string | null;
  password: string | null;
  authLoading: boolean;
  setCredentials: (user: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  username: null,
  password: null,
  authLoading: true,
  setCredentials: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('@username');
        const savedPass = await AsyncStorage.getItem('@password');

        if (savedUser && savedPass) {
          setUsername(savedUser);
          setPassword(savedPass);
        }
      } catch (e) {
        console.error('AuthContext loadCredentials error:', e);
      } finally {
        setAuthLoading(false);
      }
    };

    loadCredentials();
  }, []);

  const setCredentials = async (user: string, pass: string) => {
    try {
      setUsername(user);
      setPassword(pass);
      await AsyncStorage.setItem('@username', user);
      await AsyncStorage.setItem('@password', pass);
    } catch (e) {
      console.error('AuthContext setCredentials error:', e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      setUsername(null);
      setPassword(null);
      await AsyncStorage.removeItem('@username');
      await AsyncStorage.removeItem('@password');
    } catch (e) {
      console.error('AuthContext logout error:', e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ username, password, authLoading, setCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);