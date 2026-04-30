import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

type Props = {
  visible: boolean;
  onRetry: () => void;
  onLater: () => void;
};

export default function PermissionModal({
  visible,
  onRetry,
  onLater,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Permissions requises</Text>

          <Text style={styles.message}>
            L’application a besoin de la caméra pour scanner les codes-barres
            et du microphone pour l’enregistrement vocal.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.laterBtn} onPress={onLater}>
              <Text style={styles.laterText}>Plus tard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
              <Text style={styles.retryText}>Autoriser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#0f172a',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  laterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  laterText: {
    color: '#475569',
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});