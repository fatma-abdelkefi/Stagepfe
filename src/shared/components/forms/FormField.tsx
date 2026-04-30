import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
};

export default function FormField({ label, required, children }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}> *</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b92b0',
    letterSpacing: 0.3,
  },
  required: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f43f5e',
  },
});
