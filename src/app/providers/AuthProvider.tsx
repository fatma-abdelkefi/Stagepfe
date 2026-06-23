import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthSession = {
  username: string;
  password: string;
};

type AuthContextType = {
  session: AuthSession | null;
  username: string | null;
  password: string | null;
  authLoading: boolean;
  setSession: (session: AuthSession) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const STORAGE_KEY = '@auth_session'; // ← exporté pour maximoClient

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadSession = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AuthSession = JSON.parse(raw);
        if (parsed?.username && parsed?.password) {
          setSessionState(parsed);
        }
      } else {
        // Si le storage est vide (effacé par l'intercepteur), on remet null
        setSessionState(null);
      }
    } catch (error) {
      console.log('Failed to load auth session:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const setSession = async (newSession: AuthSession) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setSessionState(newSession);
    } catch (error) {
      console.log('Failed to save auth session:', error);
      throw error;
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSessionState(null);
    } catch (error) {
      console.log('Failed to clear auth session:', error);
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      session,
      username: session?.username ?? null,
      password: session?.password ?? null,
      authLoading,
      setSession,
      clearSession,
    }),
    [session, authLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
