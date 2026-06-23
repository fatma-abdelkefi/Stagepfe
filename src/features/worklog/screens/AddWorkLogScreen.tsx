import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../../app/navigation/types';

import AppInput from '../../../shared/components/forms/AppInput';
import RichHtmlEditor from '../../../shared/components/forms/RichHtmlEditor';
import AppPermissionsModal from '../../startup/components/AppPermissionsModal';

import {
  useWorkLogViewModel,
  WORKLOG_TYPES,
} from '../viewmodels/useWorkLogViewModel';
import { useWorkOrdersPermissionsViewModel } from '../../workorders/viewmodels/useWorkOrdersPermissionsViewModel';

type Props = {
  route: RouteProp<RootStackParamList, 'AddWorkLog'>;
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  surfaceLift: '#1c2133',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  accentSoft: 'rgba(61,106,255,0.15)',
  accentMid: 'rgba(61,106,255,0.25)',
  text: '#f8fafc',
  textSub: '#8b92b0',
  textMuted: '#4b5272',
  pill: 'rgba(61,106,255,0.12)',
  successBg: 'rgba(22,163,74,0.12)',
  successBorder: 'rgba(34,197,94,0.35)',
  successText: '#86efac',
  errorBg: 'rgba(220,38,38,0.12)',
  errorBorder: 'rgba(248,113,113,0.35)',
  errorText: '#fca5a5',
  transcriptBg: '#0b1120',
  warningBg: 'rgba(245, 158, 11, 0.10)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  warningText: '#fcd34d',
  recordRed: '#ef4444',
  recordRedSoft: 'rgba(239,68,68,0.15)',
};

export default function AddWorkLogScreen({ route }: Props) {
  const navigation = useNavigation<any>();

  const vm = useWorkLogViewModel({
    wonum: route.params?.wonum,
    worklogCollectionRef: route.params?.worklogCollectionRef,
    woHref: route.params?.woHref,
    mxwoDetailsHref: route.params?.mxwoDetailsHref,
    onSuccess: () => navigation.goBack(),
  });

  const permissionsVM = useWorkOrdersPermissionsViewModel(false);

  function getCurrentDateTimeForDisplay() {
    const d = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');

    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}  ${pad2(
      d.getHours(),
    )}:${pad2(d.getMinutes())}`;
  }

  const handleVoicePress = async () => {
    if (!vm.recording) {
      const granted = await permissionsVM.ensureMicrophonePermission();
      if (!granted) return;
    }

    await vm.onVoicePress();
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />

      <View style={styles.navbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FeatherIcon name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Work Log</Text>
          {vm.wonum ? (
            <View style={styles.woBadge}>
              <Text style={styles.woBadgeText}>OT #{vm.wonum}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!vm.canSubmit && (
          <View style={styles.warnBanner}>
            <FeatherIcon name="alert-triangle" size={15} color={C.warningText} />
            <Text style={styles.warnText}>
              Session ou URL manquante. Retournez et réessayez.
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>DICTÉE VOCALE</Text>

        <View style={styles.voiceCard}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleVoicePress}
            disabled={vm.voiceLoading}
            style={[
              styles.voiceCenterBtn,
              vm.recording && styles.voiceCenterBtnRecording,
              vm.voiceLoading && { opacity: 0.6 },
            ]}
          >
            {vm.voiceLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <FeatherIcon
                name={vm.recording ? 'square' : 'mic'}
                size={26}
                color="#fff"
              />
            )}
          </TouchableOpacity>

          <Text style={styles.voiceLabel}>
            {vm.voiceLoading
              ? 'Analyse en cours…'
              : vm.recording
              ? 'Appuyez pour arrêter'
              : 'Appuyez pour dicter'}
          </Text>

          {vm.recording && <View style={styles.pulseRing} pointerEvents="none" />}

          {vm.voiceInfo ? (
            <View
              style={[
                styles.voiceStatus,
                vm.voiceError
                  ? styles.voiceStatusError
                  : styles.voiceStatusSuccess,
              ]}
            >
              <FeatherIcon
                name={vm.voiceError ? 'x-circle' : 'check-circle'}
                size={14}
                color={vm.voiceError ? C.errorText : C.successText}
              />
              <Text
                style={[
                  styles.voiceStatusText,
                  vm.voiceError
                    ? { color: C.errorText }
                    : { color: C.successText },
                ]}
              >
                {vm.voiceInfo}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>INFORMATIONS</Text>

        <View style={styles.infoBlock}>
          <View style={styles.row2col}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Classe</Text>
              <View style={styles.readOnlyChip}>
                <Text style={styles.readOnlyChipText}>WORKORDER</Text>
              </View>
            </View>

            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Date</Text>
              <View style={styles.readOnlyChip}>
                <Text style={[styles.readOnlyChipText, { fontSize: 11 }]}>
                  {getCurrentDateTimeForDisplay()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Créé par</Text>
            <AppInput
              icon="user"
              value={vm.createdBy}
              onChangeText={vm.setCreatedBy}
              placeholder="Entrez votre identifiant"
              autoCapitalize="characters"
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Type</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              {WORKLOG_TYPES.map(item => {
                const active = item.value === vm.selectedType.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.8}
                    onPress={() => vm.setSelectedType(item)}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                  >
                    {active && (
                      <FeatherIcon
                        name="check"
                        size={12}
                        color={C.accent}
                        style={{ marginRight: 4 }}
                      />
                    )}

                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Résumé</Text>
              <Text style={styles.requiredDot}>*</Text>
            </View>

            <AppInput
              icon="file-text"
              value={vm.description}
              onChangeText={vm.setDescription}
              returnKeyType="done"
            />

            <View style={styles.counterRow}>
              <Text
                style={[
                  styles.counterText,
                  vm.descriptionTooLong && styles.counterTextError,
                ]}
              >
                {vm.descriptionLength}/{vm.maxDescriptionLength} caractères
              </Text>
            </View>

            {vm.descriptionTooLong ? (
              <View style={styles.inlineError}>
                <FeatherIcon name="alert-circle" size={13} color={C.errorText} />
                <Text style={styles.inlineErrorText}>
                  {vm.descriptionLimitMessage}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>DÉTAILS</Text>

        <View style={styles.editorShell}>
          <RichHtmlEditor
            value={vm.detailsHtml}
            onChange={vm.setDetailsHtml}
            height={320}
          />
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {vm.successVisible && (
          <View style={[styles.toast, styles.toastSuccess]}>
            <FeatherIcon name="check-circle" size={15} color={C.successText} />
            <Text style={[styles.toastText, { color: C.successText }]}>
              Work Log ajouté avec succès !
            </Text>

            <TouchableOpacity
              onPress={vm.closeSuccess}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FeatherIcon name="x" size={14} color={C.successText} />
            </TouchableOpacity>
          </View>
        )}

        {vm.errorVisible && (
          <View style={[styles.toast, styles.toastError]}>
            <FeatherIcon name="alert-circle" size={15} color={C.errorText} />
            <Text
              style={[styles.toastText, { color: C.errorText }]}
              numberOfLines={1}
            >
              {vm.errorMessage}
            </Text>

            <TouchableOpacity
              onPress={vm.closeError}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FeatherIcon name="x" size={14} color={C.errorText} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomBtns}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.cancelBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={vm.submit}
            disabled={!vm.canSubmit || vm.saving || vm.descriptionTooLong}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              (!vm.canSubmit || vm.saving || vm.descriptionTooLong) &&
                styles.submitBtnDisabled,
            ]}
          >
            {vm.saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FeatherIcon name="save" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <AppPermissionsModal
        visible={permissionsVM.visible}
        mode={permissionsVM.mode}
        blockedCamera={permissionsVM.blockedCamera}
        blockedMicrophone={permissionsVM.blockedMicrophone}
        onConfirm={permissionsVM.confirmSelection}
        onLater={permissionsVM.closeModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenter: {
    alignItems: 'center',
    gap: 4,
  },
  navTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  woBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accentMid,
  },
  woBadgeText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.warningBg,
    borderWidth: 1,
    borderColor: C.warningBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  warnText: {
    flex: 1,
    color: C.warningText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },

  sectionLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
  },

  voiceCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: C.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderAlt,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  voiceCenterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  voiceCenterBtnRecording: {
    backgroundColor: C.recordRed,
    shadowColor: C.recordRed,
  },
  voiceLabel: {
    marginTop: 14,
    color: C.textSub,
    fontSize: 13,
    fontWeight: '500',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.25)',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
  },
  voiceStatus: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  voiceStatusSuccess: {
    backgroundColor: C.successBg,
    borderColor: C.successBorder,
  },
  voiceStatusError: {
    backgroundColor: C.errorBg,
    borderColor: C.errorBorder,
  },
  voiceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  transcriptBox: {
    backgroundColor: C.transcriptBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderAlt,
    padding: 14,
    marginBottom: 24,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  transcriptLabel: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  transcriptText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 22,
  },

  infoBlock: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderAlt,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  row2col: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
    gap: 6,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  fieldLabel: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  requiredDot: {
    color: C.accent,
    fontSize: 14,
    lineHeight: 14,
  },

  readOnlyChip: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  readOnlyChipText: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: '600',
  },

  chipScroll: {
    marginHorizontal: -2,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    marginHorizontal: 3,
  },
  typeChipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  typeChipText: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: C.accent,
  },

  editorShell: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borderAlt,
    backgroundColor: '#fff',
    marginBottom: 10,
  },

  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    gap: 10,
  },
  bottomBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
  },
  cancelBtnText: {
    color: C.textSub,
    fontSize: 15,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: C.successBg,
    borderColor: C.successBorder,
  },
  toastError: {
    backgroundColor: C.errorBg,
    borderColor: C.errorBorder,
  },
  toastText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },

  counterRow: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  counterText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  counterTextError: {
    color: C.errorText,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.errorBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  inlineErrorText: {
    flex: 1,
    color: C.errorText,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
});