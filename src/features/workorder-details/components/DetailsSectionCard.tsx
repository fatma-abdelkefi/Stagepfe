import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

type Props = {
  title: string;
  subtitle?: string;
  count?: number;
  icon?: string;
  onPress: () => void;
};

export default function DetailsSectionCard({
  title,
  subtitle,
  count,
  icon = 'chevron-right',
  onPress,
}: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.right}>
        {typeof count === 'number' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
        <FeatherIcon name={icon as any} size={18} color="#64748b" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  badgeText: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 12,
  },
});