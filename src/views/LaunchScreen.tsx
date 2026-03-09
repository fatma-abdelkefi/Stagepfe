// src/views/LaunchScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  StatusBar,
  Modal,
  TouchableOpacity,
  Linking,
  AppState,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { Camera } from 'react-native-vision-camera';

type LaunchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Launch'
>;

export default function LaunchScreen() {
  const navigation = useNavigation<LaunchScreenNavigationProp>();
  const { username, password, authLoading } = useAuth();
  const isLoggedIn = !!username && !!password;

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [navigated, setNavigated] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    const timer = setTimeout(() => {
      setAnimationFinished(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, slideUpAnim, pulseAnim, rotateAnim]);

  useEffect(() => {
    if (authLoading || !animationFinished) return;

    if (isLoggedIn) {
      setPermissionChecked(true);
      return;
    }

    checkCameraPermission();

    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const status = await Camera.getCameraPermissionStatus();
        console.log('📷 camera status after returning from settings:', status);

        if (status === 'granted' && !navigated) {
          setShowPermissionModal(false);
          setPermissionChecked(true);
          setNavigated(true);
          navigation.replace('Login');
        }
      }
    });

    return () => sub.remove();
  }, [authLoading, animationFinished, isLoggedIn, navigation, navigated]);

  const checkCameraPermission = async () => {
    try {
      const status = await Camera.getCameraPermissionStatus();
      console.log('📷 initial camera permission status:', status);

      if (status === 'granted') {
        setShowPermissionModal(false);
        setPermissionChecked(true);
        return;
      }

      // Show custom popup for any non-granted status
      setShowPermissionModal(true);
      setPermissionChecked(true);
    } catch (error) {
      console.error('Camera permission error:', error);
      setShowPermissionModal(true);
      setPermissionChecked(true);
    }
  };

  useEffect(() => {
    if (
      authLoading ||
      !animationFinished ||
      !permissionChecked ||
      showPermissionModal ||
      navigated
    ) {
      return;
    }

    setNavigated(true);

    if (isLoggedIn) {
      navigation.replace('WorkOrders');
    } else {
      navigation.replace('Login');
    }
  }, [
    authLoading,
    animationFinished,
    permissionChecked,
    showPermissionModal,
    navigated,
    isLoggedIn,
    navigation,
  ]);

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  };

  const handleLater = () => {
    setShowPermissionModal(false);

    if (!navigated) {
      setNavigated(true);
      navigation.replace('Login');
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#000000', '#1e3a8a', '#2563eb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <Animated.View
        style={[
          styles.circle1,
          { transform: [{ rotate: spin }, { scale: pulseAnim }] },
        ]}
      />
      <Animated.View
        style={[
          styles.circle2,
          {
            transform: [
              { rotate: spin },
              {
                scale: pulseAnim.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: [1.1, 1],
                }),
              },
            ],
          },
        ]}
      />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.logoGlow}>
            <Image
              source={require('../assets/smartech_logo.png')}
              style={styles.logo}
            />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] },
          ]}
        >
          <Text style={styles.subtitle}>Smartech Eam Experts</Text>
        </Animated.View>
      </View>

      <Modal
        visible={showPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={handleLater}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Autorisation caméra requise</Text>
            <Text style={styles.modalMessage}>
              Pour utiliser le scan code-barres, veuillez autoriser l’accès à la
              caméra dans les paramètres de l’application.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleOpenSettings}
            >
              <Text style={styles.primaryButtonText}>Ouvrir les paramètres</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleLater}
            >
              <Text style={styles.secondaryButtonText}>Plus tard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    top: -100,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    bottom: -150,
    left: -150,
  },

  logoContainer: { marginBottom: 40 },
  logoGlow: {
    padding: 30,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  logo: { width: 240, height: 240, resizeMode: 'contain' },

  textContainer: { alignItems: 'center' },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#93c5fd',
    letterSpacing: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
});