import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import LoginForm from '../components/LoginForm';

// ⚠️ Adapte ce chemin selon ton projet
type RootStackParamList = {
  Login: { sessionExpired?: boolean } | undefined;
};
type LoginRoute = RouteProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const route = useRoute<LoginRoute>();

  // Affiche la bannière SEULEMENT si redirigé automatiquement après expiration
  const sessionExpired = route.params?.sessionExpired === true;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, () => {
      scrollRef.current?.scrollTo({ y: 180, animated: true });
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />

      {/* Header bleu */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1e40af']}
        style={styles.headerGradient}
      >
        <Animated.View
          style={[styles.headerContent, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }]}
        >
          <View style={styles.logoCircle}>
            <LinearGradient colors={['#60a5fa', '#3b82f6']} style={styles.logoGradient}>
              <Ionicons name="business" size={32} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.brandName}>SMARTECH</Text>
          <Text style={styles.brandTagline}>Eam Experts</Text>
        </Animated.View>
      </LinearGradient>

      {/* Bannière session expirée — invisible si connexion normale */}
      {sessionExpired && (
        <View style={styles.expiredBanner}>
          <Ionicons name="warning-outline" size={18} color="#92400e" />
          <Text style={styles.expiredText}>
            Votre session a expiré. Veuillez vous reconnecter.
          </Text>
        </View>
      )}

      {/* Formulaire */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <LoginForm />
      </Animated.View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    marginBottom: 16,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Visible seulement après expiration de session
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  expiredText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
    lineHeight: 18,
  },

  bottomSpacer: {
    height: 300,
  },
});
