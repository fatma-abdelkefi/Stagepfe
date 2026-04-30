import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export default function Screen({ children }: any) {
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});