import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Confirmer la déconnexion</Text>
          <Text style={styles.modalMessage}>
            Êtes-vous sûr de vouloir vous déconnecter ?
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]}
              onPress={onCancel}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#3b82f6' }]}
              onPress={onConfirm}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    color: '#0f172a',
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
    color: '#1e293b',
  },
  modalConfirmText: {
    fontWeight: '600',
    color: '#fff',
  },
});