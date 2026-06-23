import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { colors } from '../../theme/colors';

interface CustomTimePickerProps {
  visible: boolean;
  selectedDate: Date | null;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export default function CustomTimePicker({
  visible,
  selectedDate,
  onConfirm,
  onCancel,
}: CustomTimePickerProps) {
  const initialDate = useMemo(() => selectedDate || new Date(), [selectedDate]);

  const [hour, setHour] = useState(initialDate.getHours());
  const [minute, setMinute] = useState(initialDate.getMinutes());

  useEffect(() => {
    if (visible) {
      const date = selectedDate || new Date();
      setHour(date.getHours());
      setMinute(date.getMinutes());
    }
  }, [visible, selectedDate]);

  const increaseHour = () => setHour(prev => (prev + 1) % 24);
  const decreaseHour = () => setHour(prev => (prev - 1 + 24) % 24);

  const increaseMinute = () => setMinute(prev => (prev + 5) % 60);
  const decreaseMinute = () => setMinute(prev => (prev - 5 + 60) % 60);

  const confirm = () => {
    const next = new Date(selectedDate || new Date());

    next.setHours(hour);
    next.setMinutes(minute);
    next.setSeconds(0);
    next.setMilliseconds(0);

    onConfirm(next);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Sélectionner une heure</Text>
                <Text style={styles.subtitle}>
                  {pad(hour)}:{pad(minute)}
                </Text>
              </View>

              <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                <FeatherIcon name="x" size={19} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <TouchableOpacity
                  onPress={increaseHour}
                  style={styles.stepButton}
                >
                  <FeatherIcon
                    name="chevron-up"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.timeValue}>{pad(hour)}</Text>

                <TouchableOpacity
                  onPress={decreaseHour}
                  style={styles.stepButton}
                >
                  <FeatherIcon
                    name="chevron-down"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.timeLabel}>Heure</Text>
              </View>

              <Text style={styles.separator}>:</Text>

              <View style={styles.timeColumn}>
                <TouchableOpacity
                  onPress={increaseMinute}
                  style={styles.stepButton}
                >
                  <FeatherIcon
                    name="chevron-up"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.timeValue}>{pad(minute)}</Text>

                <TouchableOpacity
                  onPress={decreaseMinute}
                  style={styles.stepButton}
                >
                  <FeatherIcon
                    name="chevron-down"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.timeLabel}>Minute</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={confirm} style={styles.confirmButton}>
                <Text style={styles.confirmText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '88%',
    maxWidth: 380,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 10,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },

  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSub,
  },

  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  timeColumn: {
    alignItems: 'center',
  },

  stepButton: {
    width: 42,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeValue: {
    marginVertical: 8,
    minWidth: 68,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
  },

  separator: {
    marginHorizontal: 12,
    fontSize: 32,
    fontWeight: '900',
    color: colors.textSub,
  },

  timeLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSub,
  },

  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  confirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSub,
  },

  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
});