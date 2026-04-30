import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  visible: boolean;
  onCamera: () => void;
  onFile: () => void;
  onCancel: () => void;
};

export default function ChooseDocumentSourceModal({
  visible,
  onCamera,
  onFile,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrapper}
          >
            <FeatherIcon name="paperclip" size={28} color="#fff" />
          </LinearGradient>

          <Text style={styles.title}>Ajouter un document</Text>
          <Text style={styles.message}>
            Choisissez une source pour ajouter une pièce jointe.
          </Text>

          <TouchableOpacity onPress={onCamera} activeOpacity={0.85} style={styles.option}>
            <View style={styles.optionIcon}>
              <FeatherIcon name="camera" size={20} color="#2563eb" />
            </View>

            <View style={styles.optionTextBox}>
              <Text style={styles.optionTitle}>Prendre une photo</Text>
              <Text style={styles.optionSubtitle}>Ouvrir la caméra</Text>
            </View>

            <FeatherIcon name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onFile} activeOpacity={0.85} style={styles.option}>
            <View style={styles.optionIcon}>
              <FeatherIcon name="folder" size={20} color="#2563eb" />
            </View>

            <View style={styles.optionTextBox}>
              <Text style={styles.optionTitle}>Choisir un fichier</Text>
              <Text style={styles.optionSubtitle}>PDF, image, Word, Excel...</Text>
            </View>

            <FeatherIcon name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '86%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    fontWeight: '500',
  },
  option: {
    width: '100%',
    minHeight: 66,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextBox: {
    flex: 1,
  },
  optionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  optionSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  cancelButton: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '800',
    fontSize: 15,
  },
});