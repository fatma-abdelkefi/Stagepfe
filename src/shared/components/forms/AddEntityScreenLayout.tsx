import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';

import FormSubmitButton from './FormSubmitButton';
import SuccessModal from '../feedback/SuccessModal';
import ErrorModal from '../feedback/ErrorModal';

type Props = {
  title: string;
  badgeText?: string;
  badgeSecondaryText?: string;
  children: React.ReactNode;

  submitTitle: string;
  submitIcon?: string;
  onSubmit: () => void | Promise<void>;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  onCancel: () => void;

  successVisible?: boolean;
  successTitle?: string;
  successMessage?: string;
  onCloseSuccess?: () => void;

  errorVisible?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  onCloseError?: () => void;
};

const C = {
  bg: '#0a0d14',
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  textPrimary: '#e8ebf5',
  textSub: '#8b92b0',
  textMuted: '#4a5270',
  pill: 'rgba(61,106,255,0.12)',
  pillBorder: 'rgba(61,106,255,0.30)',
};

export default function AddEntityScreenLayout({
  title,
  badgeText,
  badgeSecondaryText,
  children,
  submitTitle,
  submitIcon = 'check',
  onSubmit,
  submitLoading = false,
  submitDisabled = false,
  onCancel,
  successVisible = false,
  successTitle = 'Succès',
  successMessage = '',
  onCloseSuccess,
  errorVisible = false,
  errorTitle = 'Erreur',
  errorMessage = '',
  onCloseError,
}: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <FeatherIcon name="arrow-left" size={18} color={C.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        <View style={styles.badgeGroup}>
          {!!badgeText && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          )}
          {!!badgeSecondaryText && (
            <View style={[styles.badge, styles.badgeAlt]}>
              <Text style={[styles.badgeText, styles.badgeAltText]}>
                {badgeSecondaryText}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.headerDivider} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}

        <FormSubmitButton
          title={submitTitle}
          icon={submitIcon}
          onPress={onSubmit}
          loading={submitLoading}
          disabled={submitDisabled}
        />

        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancelBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>* Champs obligatoires</Text>
      </ScrollView>

      <SuccessModal
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        onClose={onCloseSuccess || (() => {})}
      />

      <ErrorModal
        visible={errorVisible}
        title={errorTitle}
        message={errorMessage}
        onClose={onCloseError || (() => {})}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderAlt,
  },
  headerCenter: { flex: 1 },
  eyebrow: {
    color: C.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: C.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: C.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.pillBorder,
  },
  badgeAlt: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.borderAlt,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
  },
  badgeAltText: {
    color: C.textSub,
  },
  headerDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSub,
  },
  hint: {
    textAlign: 'center',
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
  },
});