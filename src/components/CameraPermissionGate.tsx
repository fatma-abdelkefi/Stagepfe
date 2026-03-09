import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'react-native-vision-camera';

type Props = {
  onReady: () => void;
};

export default function CameraPermissionGate({ onReady }: Props) {
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const status = await Camera.getCameraPermissionStatus();

      if (status === 'granted') {
        setShowPermissionModal(false);
        onReady();
        return;
      }

      if (status === 'not-determined') {
        const newStatus = await Camera.requestCameraPermission();

        if (newStatus === 'granted') {
          setShowPermissionModal(false);
          onReady();
          return;
        }
      }

      setShowPermissionModal(true);
    } catch (error) {
      console.error('Camera permission error:', error);
      setShowPermissionModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  };

  const handleContinueWithoutPermission = () => {
    setShowPermissionModal(false);
    onReady();
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0A74DA" />
      </View>
    );
  }

  return (
    <Modal visible={showPermissionModal} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Permission caméra requise</Text>
          <Text style={styles.message}>
            Cette application a besoin de l'accès à la caméra pour scanner les codes-barres.
            Veuillez autoriser l'accès dans les paramètres de l'application.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleOpenSettings}>
            <Text style={styles.primaryButtonText}>Ouvrir les paramètres</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleContinueWithoutPermission}>
            <Text style={styles.secondaryButtonText}>Continuer vers connexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#0A74DA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
});