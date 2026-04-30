import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

export type PermissionModalMode = 'all' | 'camera' | 'microphone';

type PermissionStatus = 'idle' | 'selected' | 'granted' | 'blocked';

type Props = {
  visible: boolean;
  mode?: PermissionModalMode;
  blockedCamera?: boolean;
  blockedMicrophone?: boolean;
  grantedCamera?: boolean;
  grantedMicrophone?: boolean;
  onConfirm: (selection: { camera: boolean; microphone: boolean }) => Promise<void> | void;
  onLater: () => void;
};

function CheckItem({
  label,
  checked,
  granted,
  blocked,
  onPress,
  disabled,
}: {
  label: string;
  checked: boolean;
  granted?: boolean;
  blocked?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  let badgeText = '';
  let badgeStyle = styles.badgeIdle;
  let badgeTextStyle = styles.badgeIdleText;

  if (granted) {
    badgeText = 'Autorisée';
    badgeStyle = styles.badgeGranted;
    badgeTextStyle = styles.badgeGrantedText;
  } else if (blocked) {
    badgeText = 'Bloquée';
    badgeStyle = styles.badgeBlocked;
    badgeTextStyle = styles.badgeBlockedText;
  } else if (checked) {
    badgeText = 'Sélectionnée';
    badgeStyle = styles.badgeSelected;
    badgeTextStyle = styles.badgeSelectedText;
  }

  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          disabled && styles.checkboxDisabled,
        ]}
      >
        {checked ? <Text style={styles.check}>✓</Text> : null}
      </View>

      <View style={styles.rowContent}>
        <Text style={[styles.rowText, disabled && styles.rowTextDisabled]}>
          {label}
        </Text>

        {badgeText ? (
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeText, badgeTextStyle]}>{badgeText}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function AppPermissionsModal({
  visible,
  mode = 'all',
  blockedCamera = false,
  blockedMicrophone = false,
  grantedCamera = false,
  grantedMicrophone = false,
  onConfirm,
  onLater,
}: Props) {
  const onlyCamera = mode === 'camera';
  const onlyMicrophone = mode === 'microphone';

  const [camera, setCamera] = useState(mode !== 'microphone');
  const [microphone, setMicrophone] = useState(mode !== 'camera');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setSubmitting(false);

    if (mode === 'camera') {
      setCamera(true);
      setMicrophone(false);
      return;
    }

    if (mode === 'microphone') {
      setCamera(false);
      setMicrophone(true);
      return;
    }

    setCamera(true);
    setMicrophone(true);
  }, [visible, mode]);

  const allSelected = useMemo(() => camera && microphone, [camera, microphone]);

  const toggleAll = () => {
    if (mode !== 'all') return;
    const next = !allSelected;
    setCamera(next);
    setMicrophone(next);
  };

  const title = useMemo(() => {
    if (onlyCamera) return 'Autorisation caméra';
    if (onlyMicrophone) return 'Autorisation microphone';
    return 'Autorisations requises';
  }, [onlyCamera, onlyMicrophone]);

  const message = useMemo(() => {
    if (onlyCamera) {
      return blockedCamera
        ? "La permission caméra est bloquée par Android. La case peut rester cochée, mais l'autorisation réelle ne peut plus être accordée automatiquement."
        : 'La caméra est nécessaire pour utiliser le scan.';
    }

    if (onlyMicrophone) {
      return blockedMicrophone
        ? "La permission microphone est bloquée par Android. La case peut rester cochée, mais l'autorisation réelle ne peut plus être accordée automatiquement."
        : "Le microphone est nécessaire pour utiliser l'enregistrement vocal.";
    }

    if (blockedCamera || blockedMicrophone) {
      return "Choisissez les permissions à demander. Si Android a bloqué une permission, elle peut rester sélectionnée visuellement mais ne sera pas réellement autorisée automatiquement.";
    }

    return "Choisissez les permissions à autoriser pour utiliser le scan code-barres et l’enregistrement vocal.";
  }, [onlyCamera, onlyMicrophone, blockedCamera, blockedMicrophone]);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      await onConfirm({ camera, microphone });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {mode === 'all' ? (
            <>
              <CheckItem
                label="Tout sélectionner"
                checked={allSelected}
                onPress={toggleAll}
              />
              <View style={styles.separator} />
            </>
          ) : null}

          <CheckItem
            label="Caméra"
            checked={camera}
            granted={grantedCamera}
            blocked={blockedCamera}
            onPress={() => setCamera(prev => !prev)}
            disabled={onlyMicrophone || submitting}
          />

          <CheckItem
            label="Microphone"
            checked={microphone}
            granted={grantedMicrophone}
            blocked={blockedMicrophone}
            onPress={() => setMicrophone(prev => !prev)}
            disabled={onlyCamera || submitting}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.laterBtn}
              onPress={onLater}
              disabled={submitting}
            >
              <Text style={styles.laterText}>Plus tard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>Autoriser</Text>
              )}
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
    borderRadius: 18,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowDisabled: {
    opacity: 0.7,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxDisabled: {
    backgroundColor: '#e2e8f0',
    borderColor: '#cbd5e1',
  },
  check: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  rowContent: {
    marginLeft: 12,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  rowTextDisabled: {
    color: '#64748b',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeIdle: {
    backgroundColor: '#e2e8f0',
  },
  badgeIdleText: {
    color: '#475569',
  },
  badgeSelected: {
    backgroundColor: '#dbeafe',
  },
  badgeSelectedText: {
    color: '#1d4ed8',
  },
  badgeGranted: {
    backgroundColor: '#dcfce7',
  },
  badgeGrantedText: {
    color: '#15803d',
  },
  badgeBlocked: {
    backgroundColor: '#fee2e2',
  },
  badgeBlockedText: {
    color: '#b91c1c',
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
  confirmBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.8,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700',
  },
});