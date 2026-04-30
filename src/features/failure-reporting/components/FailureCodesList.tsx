import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Card from '../../../shared/components/layout/Card';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import { colors } from '../../../shared/theme/colors';
import type { FailureCodeRow } from '../types/failureReporting.types';
import { getFailureTypeLabel } from '../utils/failureFormatters';

type Props = {
  title?: string;
  rows: FailureCodeRow[];
};

type BadgeVariant = 'problem' | 'cause' | 'remedy';

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: colors.primary,
  text: '#000000',
  textSub: '#000000',
  textMuted: '#4b5272',

  problemBg: 'rgba(59,130,246,0.12)',
  problemBorder: 'rgba(59,130,246,0.28)',
  problemText: '#93c5fd',

  causeBg: 'rgba(245,158,11,0.10)',
  causeBorder: 'rgba(245,158,11,0.28)',
  causeText: '#fcd34d',

  remedyBg: 'rgba(16,185,129,0.12)',
  remedyBorder: 'rgba(16,185,129,0.28)',
  remedyText: '#86efac',
};

const BADGE: Record<
  BadgeVariant,
  { icon: string; bg: string; border: string; text: string }
> = {
  problem: {
    icon: 'alert-circle',
    bg: C.problemBg,
    border: C.problemBorder,
    text: C.problemText,
  },
  cause: {
    icon: 'search',
    bg: C.causeBg,
    border: C.causeBorder,
    text: C.causeText,
  },
  remedy: {
    icon: 'tool',
    bg: C.remedyBg,
    border: C.remedyBorder,
    text: C.remedyText,
  },
};

function getVariant(type: FailureCodeRow['type']): BadgeVariant {
  if (type === 'PROBLEM') return 'problem';
  if (type === 'CAUSE') return 'cause';
  return 'remedy';
}

export default function FailureCodesList({
  title = 'Codes de panne',
  rows,
}: Props) {
  return (
    <Card style={styles.card}>
      <SectionLabel icon="tag" title={title} />

      {!rows.length ? (
        <View style={styles.empty}>
          <FeatherIcon name="inbox" size={26} color={C.textMuted} />
          <Text style={styles.emptyText}>Aucun code failure trouvé.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {rows.map((row, index) => {
            const variant = BADGE[getVariant(row.type)];

            return (
              <View key={`${row.type}-${row.code}-${index}`} style={styles.item}>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor: variant.bg,
                      borderColor: variant.border,
                    },
                  ]}
                >
                  <FeatherIcon
                    name={variant.icon as any}
                    size={11}
                    color={variant.text}
                  />
                  <Text style={[styles.typeBadgeText, { color: variant.text }]}>
                    {getFailureTypeLabel(row.type)}
                  </Text>
                </View>

                <View style={styles.itemContent}>
                  <Text style={styles.code}>{row.code || '—'}</Text>
                  {!!row.description && (
                    <Text style={styles.description}>{row.description}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    marginTop: 8,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 10,
    marginTop: 12,
  },
  item: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 12,
    padding: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemContent: {
    gap: 4,
  },
  code: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  description: {
    fontSize: 13,
    color: C.textSub,
    lineHeight: 18,
  },
});