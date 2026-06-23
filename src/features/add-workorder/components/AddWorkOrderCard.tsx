import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
};

const C = {
  surface: '#0f172a',
  border: 'rgba(148,163,184,0.16)',
  iconBg: 'rgba(37,99,235,0.16)',
  icon: '#60a5fa',
  text: '#e2e8f0',
  textSub: '#94a3b8',
};

export default function AddWorkOrderCard({
  title,
  subtitle,
  icon = 'clipboard',
  children,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <FeatherIcon name={icon as any} size={18} color={C.icon} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: C.textSub,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});