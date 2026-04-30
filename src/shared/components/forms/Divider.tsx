import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: '#1e2235',
    marginVertical: 4,
  },
});
