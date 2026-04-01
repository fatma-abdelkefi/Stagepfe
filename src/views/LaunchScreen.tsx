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
  AppStateStatus,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera } from 'react-native-vision-camera';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

type LaunchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Launch'
>;

type PermissionStatusType =
  | 'granted'
  | 'not-determined'
  | 'denied'
  | 'restricted';

export default function LaunchScreen() {
  const navigation = useNavigation<LaunchScreenNavigationProp>();
  const { username, password, authLoading } = useAuth();

  const isLoggedIn = !!username && !!password;

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [navigated, setNavigated] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);

  const [cameraStatus, setCameraStatus] =
    useState<PermissionStatusType>('not-determined');
  const [microphoneStatus, setMicrophoneStatus] =
    useState<PermissionStatusType>('not-determined');

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
      ]),
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      }),
    ).start();

    const timer = setTimeout(() => {
      setAnimationFinished(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, slideUpAnim, pulseAnim, rotateAnim]);

  useEffect(() => {
    if (authLoading || !animationFinished) return;

    checkPermissions();
  }, [authLoading, animationFinished]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          try {
            const cam = await Camera.getCameraPermissionStatus();
            const mic = await Camera.getMicrophonePermissionStatus();

            setCameraStatus(cam);
            setMicrophoneStatus(mic);

            if (cam === 'granted' && mic === 'granted') {
              setShowPermissionModal(false);
              setPermissionChecked(true);
            }
          } catch (error) {
            console.error('Error checking permissions on app active:', error);
          }
        }
      },
    );

    return () => subscription.remove();
  }, []);

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
    navigation.replace(isLoggedIn ? 'WorkOrders' : 'Login');
  }, [
    authLoading,
    animationFinished,
    permissionChecked,
    showPermissionModal,
    navigated,
    isLoggedIn,
    navigation,
  ]);

  const checkPermissions = async () => {
    if (checkingPermission) return;

    try {
      setCheckingPermission(true);

      const camStatus = await Camera.getCameraPermissionStatus();
      const micStatus = await Camera.getMicrophonePermissionStatus();

      setCameraStatus(camStatus);
      setMicrophoneStatus(micStatus);

      console.log('📷 initial camera status:', camStatus);
      console.log('🎤 initial microphone status:', micStatus);

      if (camStatus === 'granted' && micStatus === 'granted') {
        setShowPermissionModal(false);
        setPermissionChecked(true);
        return;
      }

      let nextCamStatus = camStatus;
      let nextMicStatus = micStatus;

      if (camStatus !== 'granted') {
        nextCamStatus = await Camera.requestCameraPermission();
        setCameraStatus(nextCamStatus);
        console.log('📷 requested camera status:', nextCamStatus);
      }

      if (micStatus !== 'granted') {
        nextMicStatus = await Camera.requestMicrophonePermission();
        setMicrophoneStatus(nextMicStatus);
        console.log('🎤 requested microphone status:', nextMicStatus);
}

      if (nextCamStatus === 'granted' && nextMicStatus === 'granted') {
        setShowPermissionModal(false);
        setPermissionChecked(true);
        return;
      }

      setShowPermissionModal(true);
      setPermissionChecked(true);
    } catch (error) {
      console.error('Permission error:', error);
      setShowPermissionModal(true);
      setPermissionChecked(true);
    } finally {
      setCheckingPermission(false);
    }
  };

  const handleAskPermissionAgain = async () => {
  try {
    let nextCamStatus = await Camera.getCameraPermissionStatus();
    let nextMicStatus = await Camera.getMicrophonePermissionStatus();

    console.log('📷 retry camera status before request:', nextCamStatus);
    console.log('🎤 retry microphone status before request:', nextMicStatus);

    if (nextCamStatus !== 'granted') {
      nextCamStatus = await Camera.requestCameraPermission();
    }

    if (nextMicStatus !== 'granted') {
      nextMicStatus = await Camera.requestMicrophonePermission();
    }

    setCameraStatus(nextCamStatus);
    setMicrophoneStatus(nextMicStatus);

    console.log('📷 retry camera status after request:', nextCamStatus);
    console.log('🎤 retry microphone status after request:', nextMicStatus);

    if (nextCamStatus === 'granted' && nextMicStatus === 'granted') {
      setShowPermissionModal(false);
      setPermissionChecked(true);
      return;
    }

    setShowPermissionModal(true);
  } catch (error) {
    console.error('Failed to ask permissions again:', error);
  }
};

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  };

  const handleLater = () => {
    setShowPermissionModal(false);
    setPermissionChecked(true);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const cameraGranted = cameraStatus === 'granted';
  const microphoneGranted = microphoneStatus === 'granted';
  const allGranted = cameraGranted && microphoneGranted;

  const probablyBlocked =
    (cameraStatus === 'denied' || microphoneStatus === 'denied') &&
    !allGranted;

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
            <Text style={styles.modalTitle}>Autorisations requises</Text>
            <Text style={styles.modalMessage}>
              Pour utiliser le scan code-barres et l’enregistrement vocal,
              veuillez autoriser l’accès à la caméra et au microphone.
            </Text>

            <View style={styles.permissionBox}>
              <Text style={styles.permissionItem}>
                Caméra : {cameraGranted ? 'Autorisée' : 'Non autorisée'}
              </Text>
              <Text style={styles.permissionItem}>
                Microphone : {microphoneGranted ? 'Autorisé' : 'Non autorisé'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAskPermissionAgain}
            >
              <Text style={styles.primaryButtonText}>
                Autoriser maintenant
              </Text>
            </TouchableOpacity>

            {probablyBlocked && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleOpenSettings}
              >
                <Text style={styles.secondaryButtonText}>
                  Ouvrir les paramètres
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.laterButton} onPress={handleLater}>
              <Text style={styles.laterButtonText}>Plus tard</Text>
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

  logoContainer: {
    marginBottom: 40,
  },
  logoGlow: {
    padding: 30,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  logo: {
    width: 240,
    height: 240,
    resizeMode: 'contain',
  },

  textContainer: {
    alignItems: 'center',
  },
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
    marginBottom: 18,
  },
  permissionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  permissionItem: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    marginBottom: 6,
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
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
});