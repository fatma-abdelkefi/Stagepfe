import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../../app/navigation/types';

import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import AppInput from '../../../shared/components/forms/AppInput';
import FormField from '../../../shared/components/forms/FormField';
import AppPermissionsModal from '../../startup/components/AppPermissionsModal';

import { useAddRelatedWorkOrderViewModel } from '../viewmodels/useAddRelatedWorkOrderViewModel';
import { useWorkOrdersPermissionsViewModel } from '../../workorders/viewmodels/useWorkOrdersPermissionsViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'AddRelatedWorkOrder'>;

const C = {
  surface: '#111520',
  border: '#1e2235',
  accent: '#3d6aff',
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

  const [detailsHeight, setDetailsHeight] = useState(50);

  const handleVoicePress = async () => {
    if (!vm.recording) {
      const granted = await permissionsVM.ensureMicrophonePermission();
      if (!granted) return;
    }

    await vm.onVoicePress();
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
                  setDetailsHeight(Math.min(150, Math.max(50, nextHeight)));
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

  detailsInputWrap: {
    position: 'relative',
  },

  detailsInput: {
    paddingRight: 54,
    minHeight: 50,
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

  transcriptBox: {
    marginTop: 10,
    backgroundColor: '#0b1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252938',
    padding: 12,
  },

  transcriptLabel: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },

  transcriptText: {
    color: C.text,
    fontSize: 13,
    lineHeight: 20,
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
});