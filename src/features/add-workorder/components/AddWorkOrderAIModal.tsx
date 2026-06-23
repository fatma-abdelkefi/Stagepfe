import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import AddWorkOrderVoiceInput from './AddWorkOrderVoiceInput';

type Props = {
  visible: boolean;
  requestText: string;
  loading: boolean;
  info?: string;
  error?: boolean;
  recording: boolean;
  voiceLoading: boolean;
  onChangeRequestText: (value: string) => void;
  onClose: () => void;
  onVoicePress: () => void;
  onGenerate: () => void;
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  green: '#22c55e',
  text: '#f8fafc',
  textSub: '#8b92b0',
};

export default function AddWorkOrderAIModal({
  visible,
  requestText,
  loading,
  info,
  error,
  recording,
  voiceLoading,
  onChangeRequestText,
  onClose,
  onVoicePress,
  onGenerate,
}: Props) {
  const disabled = loading || voiceLoading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <FeatherIcon name="cpu" size={18} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Générer avec l’IA</Text>
              <Text style={styles.subtitle}>
                Écris ou dicte une demande pour préremplir l’ordre de travail.
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={disabled}
              style={[styles.closeButton, disabled && styles.disabled]}
            >
              <FeatherIcon name="x" size={18} color={C.textSub} />
            </TouchableOpacity>
          </View>

          <AddWorkOrderVoiceInput
            label="Demande IA"
            value={requestText}
            recording={recording}
            loading={voiceLoading}
            info={info}
            error={error}
            minHeight={120}
            onChangeText={onChangeRequestText}
            onVoicePress={onVoicePress}
          />

          <TouchableOpacity
            onPress={onGenerate}
            disabled={loading || !requestText.trim()}
            activeOpacity={0.88}
            style={[
              styles.generateButton,
              (loading || !requestText.trim()) && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <FeatherIcon name="zap" size={17} color="#fff" />
            )}

            <Text style={styles.generateText}>Générer</Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            L’IA propose uniquement une suggestion. Le technicien doit vérifier
            et modifier les champs avant la création dans Maximo.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modal: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: C.text,
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: C.textSub,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButton: {
    marginTop: 4,
    backgroundColor: C.green,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  generateText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.55,
  },
  note: {
    marginTop: 12,
    color: C.textSub,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});