import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius } from '../../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
};

export default function AppButton({ title, onPress, loading }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
});