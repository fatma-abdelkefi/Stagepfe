// src/views/LaunchScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// ✅ Type de navigation pour LaunchScreen
type LaunchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Launch'
>;

export default function LaunchScreen() {
  const navigation = useNavigation<LaunchScreenNavigationProp>();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
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

    // Pulse animation loop
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

    // Rotate animation for decorative elements
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    // Navigate to Login after 3 seconds
    const timer = setTimeout(() => {
      navigation.replace('Login'); // ✅ corrigé
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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

      {/* Animated Background Circles */}
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

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo Container with Glow Effect */}
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

        {/* Subtitle */}
        <Animated.View
          style={[
            styles.textContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] },
          ]}
        >
          <Text style={styles.subtitle}>Smartech Eam Experts</Text>
        </Animated.View>
      </View>
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
  subtitle: { fontSize: 18, fontWeight: '600', color: '#93c5fd', letterSpacing: 2 },
});
