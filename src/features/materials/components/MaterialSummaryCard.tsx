import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { colors } from '../../../shared/theme';

type Props = {
  itemnum: string;
  subtitle?: string;
  description?: string;
  barcode?: string;
  icon?: string;
  color?: string;
};

export default function MaterialSummaryCard({
  itemnum,
  subtitle,
  description,
  barcode,
  icon = 'package',
  color = colors.primary,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <FeatherIcon name={icon as any} size={20} color={color} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{itemnum || 'N/A'}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {!!description && <Text style={styles.description}>{description}</Text>}

      {!!barcode && (
        <View style={styles.barcodeRow}>
          <Text style={styles.barcodeLabel}>Code à barre</Text>
          <Text style={styles.barcodeValue}>{barcode}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSub,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 20,
  },
  barcodeRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barcodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  barcodeValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
});