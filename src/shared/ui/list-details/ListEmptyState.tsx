import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LD } from './ListDetailsTheme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
};

export default function ListEmptyState({
  title,
  subtitle,
  icon = 'inbox',
}: Props) {
  return (
    <View style={styles.wrap}>
      <FeatherIcon name={icon as any} size={56} color={LD.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    marginTop: 16,
    color: LD.text,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: LD.textSub,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
});