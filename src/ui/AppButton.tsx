import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppText } from './AppText';
import { Gradients, Radius } from './theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppButton({ title, onPress, loading, disabled, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[styles.wrap, style]}>
      <LinearGradient colors={[...Gradients.action]} style={styles.inner}>
        {loading ? <ActivityIndicator color="#fff" /> : <AppText style={styles.text} bold>{title}</AppText>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.lg, overflow: 'hidden' },
  inner: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 16 },
});
