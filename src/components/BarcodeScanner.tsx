import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Feather';

type Props = {
  onScan: (wonum: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanLineAnim] = useState(new Animated.Value(0));
  const device = useCameraDevice('back');

  useEffect(() => {
    checkCameraPermission();
    startScanAnimation();
  }, []);

  const checkCameraPermission = async () => {
    const status = await Camera.getCameraPermissionStatus();
    if (status === 'granted') setHasPermission(true);
    else if (status === 'not-determined') {
      const newStatus = await Camera.requestCameraPermission();
      setHasPermission(newStatus === 'granted');
    } else {
      Alert.alert(
        'Permission requise',
        "L'accès à la caméra est nécessaire pour scanner les codes-barres.",
        [
          { text: 'Annuler', onPress: onClose },
          { text: 'Paramètres', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'ean-13'],
    onCodeScanned: (codes) => {
      if (!scanned && codes.length > 0) {
        const code = codes[0];
        if (code.value) {
          setScanned(true);
          Vibration.vibrate(100);
          setTimeout(() => onScan(code.value!), 300);
        }
      }
    },
  });

  const scanLineTranslateY = scanLineAnim.interpolate({ inputRange: [0,1], outputRange: [0,250] });

  if (!hasPermission || !device)
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={64} color="#9CA3AF" />
        <Text style={{ marginTop: 16 }}>Caméra non disponible</Text>
        <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
          <Text style={{ color: '#0A74DA' }}>Fermer</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={!scanned} codeScanner={codeScanner} torch={flashOn ? 'on' : 'off'} />

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="x" size={28} color="#fff" />
        </TouchableOpacity>

        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  closeButton: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 22, padding: 8 },
  scanLine: { position: 'absolute', width: '80%', height: 2, backgroundColor: '#0A74DA' },
});
