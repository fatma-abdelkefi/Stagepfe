import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LD } from './ListDetailsTheme';

type DetailRow = {
  label: string;
  value?: string | number | null;
};

type Props = {
  icon?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  description?: string;
  details?: DetailRow[];
  onPress?: () => void;
  rightIcon?: string;
};

export default function ListItemCard({
  icon = 'box',
  title,
  subtitle,
  meta,
  description,
  details = [],
  onPress,
  rightIcon = 'chevron-right',
}: Props) {
  const visibleDetails = details.filter(
    detail =>
      detail &&
      detail.label &&
      detail.value !== undefined &&
      detail.value !== null &&
      String(detail.value).trim() !== '',
  );

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.88 : 1}
      onPress={onPress}
      style={styles.card}
      disabled={!onPress}
    >
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <FeatherIcon name={icon as any} size={18} color={LD.accent} />
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>

          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {!!meta && <Text style={styles.meta}>{meta}</Text>}

          {!!description && (
            <Text style={styles.description}>
              {description}
            </Text>
          )}

          {visibleDetails.length > 0 && (
            <View style={styles.detailsBox}>
              {visibleDetails.map((detail, index) => (
                <View key={`${detail.label}-${index}`} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                  <Text style={styles.detailValue}>{String(detail.value)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {!!onPress && (
          <FeatherIcon name={rightIcon as any} size={18} color={LD.textSub} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: LD.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LD.border,
    padding: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: LD.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    color: LD.text,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: LD.textSub,
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    marginTop: 4,
    color: LD.textSub,
    fontSize: 12,
  },
  description: {
    marginTop: 8,
    color: LD.textSub,
    fontSize: 13,
    lineHeight: 19,
  },
  detailsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LD.border,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    color: LD.textSub,
    fontSize: 12,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    color: LD.text,
    fontSize: 12,
    textAlign: 'right',
    fontWeight: '600',
  },
});