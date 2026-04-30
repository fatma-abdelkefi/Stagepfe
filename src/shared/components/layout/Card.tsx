import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export default function Card({ children }: any) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});