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

type PermissionState = {
  camera: 'granted' | 'denied' | 'not-determined' | 'restricted';
  microphone: 'granted' | 'denied' | 'not-determined' | 'restricted';
};

export default function CameraPermissionGate({ onReady }: Props) {
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({
    camera: 'not-determined',
    microphone: 'not-determined',
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const cameraStatus = await Camera.getCameraPermissionStatus();
      const microphoneStatus = await Camera.getMicrophonePermissionStatus();

      const nextPermissions: PermissionState = {
        camera: cameraStatus,
        microphone: microphoneStatus,
      };

      setPermissions(nextPermissions);

      if (cameraStatus === 'granted' && microphoneStatus === 'granted') {
        setShowPermissionModal(false);
        onReady();
        return;
      }

      setShowPermissionModal(true);
    } catch (error) {
      console.error('Permission check error:', error);
      setShowPermissionModal(true);
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      setLoading(true);

      let cameraStatus = permissions.camera;
      let microphoneStatus = permissions.microphone;

      if (cameraStatus !== 'granted') {
        cameraStatus = await Camera.requestCameraPermission();
      }

      if (microphoneStatus !== 'granted') {
        microphoneStatus = await Camera.requestMicrophonePermission();
      }

      const nextPermissions: PermissionState = {
        camera: cameraStatus,
        microphone: microphoneStatus,
      };

      setPermissions(nextPermissions);

      const allGranted =
        cameraStatus === 'granted' && microphoneStatus === 'granted';

      if (allGranted) {
        setShowPermissionModal(false);
        onReady();
        return;
      }

      setShowPermissionModal(true);
    } catch (error) {
      console.error('Permission request error:', error);
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

  const isBlocked =
    permissions.camera === 'denied' || permissions.microphone === 'denied';

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
          <Text style={styles.title}>Permissions requises</Text>

          <Text style={styles.message}>
            Cette application a besoin de l’accès à la caméra pour scanner les codes-barres
            et du microphone pour l’enregistrement audio.
          </Text>

          <View style={styles.permissionBox}>
            <Text style={styles.permissionItem}>
              Caméra : {permissions.camera === 'granted' ? 'Autorisée' : 'Non autorisée'}
            </Text>
            <Text style={styles.permissionItem}>
              Microphone : {permissions.microphone === 'granted' ? 'Autorisé' : 'Non autorisé'}
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={requestPermissions}>
            <Text style={styles.primaryButtonText}>Autoriser maintenant</Text>
          </TouchableOpacity>

          {isBlocked && (
            <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
              <Text style={styles.settingsButtonText}>Ouvrir les paramètres</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContinueWithoutPermission}
          >
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
    marginBottom: 16,
  },
  permissionBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  permissionItem: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 6,
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
  settingsButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsButtonText: {
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