import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import AppInput from '../forms/AppInput';

export type CommonChatbotOption = {
  label: string;
  value: string;
  icon?: string;
};

export type CommonChatbotQuestion = {
  title?: string;
  message: string;
  inputPlaceholder?: string;
  options?: CommonChatbotOption[];
};

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  question: CommonChatbotQuestion | null;
  answer: string;
  loading?: boolean;
  onChangeAnswer: (value: string) => void;
  onSubmitAnswer: (value?: string) => void;
  onClose: () => void;
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  green: '#22c55e',
  textSub: '#8b92b0',
  text: '#f8fafc',
  white: '#ffffff',
};

export default function CommonChatbotModal({
  visible,
  title = 'Assistant clarification',
  subtitle = 'Répondez pour compléter les champs manquants.',
  question,
  answer,
  loading = false,
  onChangeAnswer,
  onSubmitAnswer,
  onClose,
}: Props) {
  const hasOptions = !!question?.options?.length;
  const canSubmitText = !!answer.trim() && !loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <FeatherIcon name="message-circle" size={18} color={C.white} />
            </View>

            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={styles.closeButton}
              activeOpacity={0.85}
            >
              <FeatherIcon name="x" size={18} color={C.textSub} />
            </TouchableOpacity>
          </View>

          {question?.title ? (
            <Text style={styles.questionTitle}>{question.title}</Text>
          ) : null}

          <Text style={styles.questionText}>
            {question?.message || 'Information complémentaire nécessaire.'}
          </Text>

          {hasOptions ? (
            <View style={styles.optionsWrap}>
              {question?.options?.map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => onSubmitAnswer(option.value)}
                  disabled={loading}
                  style={styles.optionButton}
                  activeOpacity={0.88}
                >
                  <View style={styles.optionIcon}>
                    <FeatherIcon
                      name={(option.icon || 'chevron-right') as any}
                      size={16}
                      color={C.white}
                    />
                  </View>

                  <Text style={styles.optionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              <AppInput
                icon="edit-3"
                value={answer}
                onChangeText={onChangeAnswer}
                placeholder={question?.inputPlaceholder || 'Votre réponse'}
                returnKeyType="done"
              />

              <TouchableOpacity
                onPress={() => onSubmitAnswer()}
                disabled={!canSubmitText}
                activeOpacity={0.88}
                style={[
                  styles.submitButton,
                  !canSubmitText && styles.buttonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <FeatherIcon name="check" size={17} color={C.white} />
                )}

                <Text style={styles.submitText}>Valider</Text>
              </TouchableOpacity>
            </>
          )}
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

  card: {
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

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextWrap: {
    flex: 1,
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
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  questionTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },

  questionText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 14,
  },

  optionsWrap: {
    gap: 10,
  },

  optionButton: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  optionIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionText: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
  },

  submitButton: {
    marginTop: 14,
    backgroundColor: C.green,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  submitText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
  },

  buttonDisabled: {
    opacity: 0.55,
  },
});