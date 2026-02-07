// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  username: string | null;
  password: string | null;
  setCredentials: (user: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  username: null,
  password: null,
  setCredentials: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    const loadCredentials = async () => {
      const savedUser = await AsyncStorage.getItem('@username');
      const savedPass = await AsyncStorage.getItem('@password');
      if (savedUser && savedPass) {
        setUsername(savedUser);
        setPassword(savedPass);
      }
    };
    loadCredentials();
  }, []);

  const setCredentials = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    await AsyncStorage.setItem('@username', user);
    await AsyncStorage.setItem('@password', pass);
  };

  const logout = async () => {
    setUsername(null);
    setPassword(null);
    await AsyncStorage.removeItem('@username');
    await AsyncStorage.removeItem('@password');
  };

  return (
    <AuthContext.Provider value={{ username, password, setCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
