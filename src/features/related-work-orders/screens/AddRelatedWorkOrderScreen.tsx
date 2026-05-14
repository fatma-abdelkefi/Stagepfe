import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../../app/navigation/types';

import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import AppInput from '../../../shared/components/forms/AppInput';
import FormField from '../../../shared/components/forms/FormField';
import CommonChatbotModal from '../../../shared/components/common/CommonChatbotModal';
import AppPermissionsModal from '../../startup/components/AppPermissionsModal';

import { useAddRelatedWorkOrderViewModel } from '../viewmodels/useAddRelatedWorkOrderViewModel';
import { useWorkOrdersPermissionsViewModel } from '../../workorders/viewmodels/useWorkOrdersPermissionsViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'AddRelatedWorkOrder'>;

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  green: '#22c55e',
  textSub: '#8b92b0',
  text: '#f8fafc',
  successText: '#86efac',
  errorText: '#fca5a5',
  recordRed: '#ef4444',
};

export default function AddRelatedWorkOrderScreen({
  route,
  navigation,
}: Props) {
  const wonum = String(route.params?.wonum ?? '');
  const siteid = String(route.params?.siteid ?? '');

  const vm = useAddRelatedWorkOrderViewModel(route.params);
  const permissionsVM = useWorkOrdersPermissionsViewModel(false);

  const [detailsHeight, setDetailsHeight] = useState(70);
  const [aiInputHeight, setAiInputHeight] = useState(90);

  const handleVoicePress = async () => {
    if (!vm.recording) {
      const granted = await permissionsVM.ensureMicrophonePermission();
      if (!granted) return;
    }

    await vm.onVoicePress();
  };

  const handleAiVoicePress = async () => {
    if (!vm.aiRecording) {
      const granted = await permissionsVM.ensureMicrophonePermission();
      if (!granted) return;
    }

    await vm.onAiVoicePress();
  };

  return (
    <>
      <AddEntityScreenLayout
        title="Work Order lié"
        badgeText={wonum ? `OT #${wonum}` : undefined}
        badgeSecondaryText={siteid || undefined}
        submitTitle="Enregistrer"
        submitIcon="check"
        onSubmit={vm.addRelatedWorkOrder}
        submitLoading={vm.loading}
        submitDisabled={!vm.canSubmit}
        onCancel={() => navigation.goBack()}
        successVisible={vm.successVisible}
        successTitle={vm.successTitle}
        successMessage={vm.successMessage}
        onCloseSuccess={vm.closeSuccess}
        errorVisible={vm.errorVisible}
        errorTitle={vm.errorTitle}
        errorMessage={vm.errorMessage}
        onCloseError={vm.closeError}
      >
        <View style={styles.card}>
          <View style={styles.aiGenerateTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiGenerateTitle}>Assistant IA</Text>
              <Text style={styles.aiGenerateSubtitle}>
                Dicter une demande pour générer automatiquement un WO lié
              </Text>
            </View>

            <TouchableOpacity
              onPress={vm.openAiModal}
              disabled={vm.aiLoading || vm.aiVoiceLoading}
              activeOpacity={0.88}
              style={[
                styles.aiOpenButton,
                (vm.aiLoading || vm.aiVoiceLoading) && styles.buttonDisabled,
              ]}
            >
              {vm.aiLoading || vm.aiVoiceLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FeatherIcon name="cpu" size={17} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <FormField label="Description" required>
            <AppInput
              icon="file-text"
              value={vm.description}
              onChangeText={vm.setDescription}
              returnKeyType="next"
            />
          </FormField>

          <FormField label="Details">
            <View style={styles.detailsInputWrap}>
              <AppInput
                icon="align-left"
                value={vm.details}
                onChangeText={vm.setDetails}
                multiline
                textAlignVertical="top"
                returnKeyType="done"
                onContentSizeChange={e => {
                  const nextHeight = e.nativeEvent.contentSize.height + 18;
                  setDetailsHeight(Math.min(170, Math.max(70, nextHeight)));
                }}
                style={[
                  styles.detailsInput,
                  {
                    height: detailsHeight,
                  },
                ]}
              />

              {vm.recording ? <View style={styles.micPulse} /> : null}

              <TouchableOpacity
                onPress={handleVoicePress}
                disabled={vm.voiceLoading}
                activeOpacity={0.85}
                style={[
                  styles.floatingMicBtn,
                  vm.recording && styles.floatingMicBtnActive,
                  vm.voiceLoading && styles.floatingMicBtnDisabled,
                ]}
              >
                {vm.voiceLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FeatherIcon
                    name={vm.recording ? 'square' : 'mic'}
                    size={18}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
            </View>

            {vm.voiceInfo ? (
              <View style={styles.voiceInfoBox}>
                <FeatherIcon
                  name={vm.voiceError ? 'x-circle' : 'check-circle'}
                  size={14}
                  color={vm.voiceError ? C.errorText : C.successText}
                />

                <Text
                  style={[
                    styles.voiceInfoText,
                    vm.voiceError && styles.voiceInfoTextError,
                  ]}
                >
                  {vm.voiceInfo}
                </Text>
              </View>
            ) : null}
          </FormField>

          <FormField label="Asset">
            <AppInput
              icon="cpu"
              value={vm.assetnum}
              onChangeText={vm.setAssetnum}
              autoCapitalize="characters"
              returnKeyType="next"
            />
          </FormField>

          {vm.assetDescription ? (
            <View style={styles.assetDescriptionBox}>
              <FeatherIcon name="info" size={13} color={C.textSub} />
              <Text style={styles.assetDescriptionText}>
                {vm.assetDescription}
              </Text>
            </View>
          ) : null}

          <FormField label="Location">
            <AppInput
              icon="map-pin"
              value={vm.location}
              onChangeText={vm.setLocation}
              autoCapitalize="characters"
              returnKeyType="done"
            />
          </FormField>
        </View>
      </AddEntityScreenLayout>

      <Modal
        visible={vm.aiModalVisible}
        transparent
        animationType="fade"
        onRequestClose={vm.closeAiModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aiModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <FeatherIcon name="cpu" size={18} color="#fff" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.aiModalTitle}>Générer avec IA</Text>
                <Text style={styles.aiModalHint}>
                  Dictez seulement la demande IA.
                </Text>
              </View>

              <TouchableOpacity
                onPress={vm.closeAiModal}
                disabled={vm.aiLoading || vm.aiVoiceLoading}
                style={styles.closeButton}
              >
                <FeatherIcon name="x" size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <AppInput
              icon="message-circle"
              value={vm.aiRequestText}
              onChangeText={vm.setAiRequestText}
              multiline
              textAlignVertical="top"
              onContentSizeChange={e => {
                const nextHeight = e.nativeEvent.contentSize.height + 18;
                setAiInputHeight(Math.min(160, Math.max(90, nextHeight)));
              }}
              style={[
                styles.aiRequestInput,
                {
                  height: aiInputHeight,
                },
              ]}
            />

            {vm.aiInfo ? (
              <View style={styles.aiInfoBox}>
                <FeatherIcon
                  name={vm.aiError ? 'x-circle' : 'check-circle'}
                  size={14}
                  color={vm.aiError ? C.errorText : C.successText}
                />

                <Text
                  style={[
                    styles.aiInfoText,
                    vm.aiError && styles.aiInfoTextError,
                  ]}
                >
                  {vm.aiInfo}
                </Text>
              </View>
            ) : null}

            <View style={styles.aiModalActions}>
              <TouchableOpacity
                onPress={handleAiVoicePress}
                disabled={vm.aiVoiceLoading || vm.aiLoading}
                activeOpacity={0.88}
                style={[
                  styles.aiMicButton,
                  vm.aiRecording && styles.aiMicButtonActive,
                  (vm.aiVoiceLoading || vm.aiLoading) && styles.buttonDisabled,
                ]}
              >
                {vm.aiVoiceLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FeatherIcon
                    name={vm.aiRecording ? 'square' : 'mic'}
                    size={18}
                    color="#fff"
                  />
                )}

                <Text style={styles.aiModalButtonText}>
                  {vm.aiRecording ? 'Arrêter' : 'Dicter'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => vm.generateWithAI()}
                disabled={vm.aiLoading || !vm.aiRequestText.trim()}
                activeOpacity={0.88}
                style={[
                  styles.aiGenerateButton,
                  (vm.aiLoading || !vm.aiRequestText.trim()) &&
                    styles.buttonDisabled,
                ]}
              >
                {vm.aiLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FeatherIcon name="zap" size={17} color="#fff" />
                )}

                <Text style={styles.aiModalButtonText}>Générer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonChatbotModal
        visible={vm.chatbotVisible}
        question={vm.chatbotQuestion}
        answer={vm.chatbotAnswer}
        onChangeAnswer={vm.setChatbotAnswer}
        onSubmitAnswer={vm.submitChatbotAnswer}
        onClose={vm.closeChatbot}
      />

      <AppPermissionsModal
        visible={permissionsVM.visible}
        mode={permissionsVM.mode}
        blockedCamera={permissionsVM.blockedCamera}
        blockedMicrophone={permissionsVM.blockedMicrophone}
        onConfirm={permissionsVM.confirmSelection}
        onLater={permissionsVM.closeModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },

  aiGenerateTopRow: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderAlt,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  aiGenerateTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '900',
  },

  aiGenerateSubtitle: {
    marginTop: 3,
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },

  aiOpenButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiResultCard: {
    backgroundColor: '#0b1120',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderAlt,
    padding: 12,
    marginBottom: 14,
  },

  aiResultTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },

  aiResultLine: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 4,
  },

  assetDescriptionBox: {
    marginTop: -8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },

  assetDescriptionText: {
    flex: 1,
    color: C.textSub,
    fontSize: 12,
    fontWeight: '600',
  },

  detailsInputWrap: {
    position: 'relative',
  },

  detailsInput: {
    paddingRight: 54,
    minHeight: 70,
  },

  floatingMicBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 7,
  },

  floatingMicBtnActive: {
    backgroundColor: C.recordRed,
    shadowColor: C.recordRed,
  },

  floatingMicBtnDisabled: {
    opacity: 0.6,
  },

  micPulse: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.35)',
  },

  voiceInfoBox: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  voiceInfoText: {
    flex: 1,
    color: C.successText,
    fontSize: 12,
    fontWeight: '600',
  },

  voiceInfoTextError: {
    color: C.errorText,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },

  aiModal: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  modalIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiModalTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '900',
  },

  aiModalHint: {
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

  aiRequestInput: {
    minHeight: 90,
  },

  aiInfoBox: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  aiInfoText: {
    flex: 1,
    color: C.successText,
    fontSize: 12,
    fontWeight: '600',
  },

  aiInfoTextError: {
    color: C.errorText,
  },

  aiModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  aiMicButton: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  aiMicButtonActive: {
    backgroundColor: C.recordRed,
  },

  aiGenerateButton: {
    flex: 1,
    backgroundColor: C.green,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  aiModalButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  buttonDisabled: {
    opacity: 0.55,
  },
});