import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

type Props = {
  icon: string;
  title: string;
};

export default function SectionLabel({ icon, title }: Props) {
  return (
    <View style={styles.row}>
      <FeatherIcon name={icon as any} size={11} color="#3d6aff" />
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3d6aff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
