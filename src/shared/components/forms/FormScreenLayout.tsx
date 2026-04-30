import React from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

type Props = {
  children: React.ReactNode;
  paddingBottom?: number;
};

export default function FormScreenLayout({ children, paddingBottom = 40 }: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: 16,
    gap: 12,
  },
});
