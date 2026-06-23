// src/features/failure-reporting/components/FailureCodesList.tsx

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import type {
  FailureCodeRow,
  FailureCodeType,
} from '../types/failureReporting.types';

type Props = {
  title?: string;
  rows?: FailureCodeRow[];
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  text: '#f8fafc',
  textSub: '#9ca3af',
  muted: '#6b7280',
  green: '#22c55e',
  orange: '#f59e0b',
  blue: '#3b82f6',
};

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function getTypeLabel(type: FailureCodeType): string {
  if (type === 'PROBLEM') return 'Problème';
  if (type === 'CAUSE') return 'Cause';
  if (type === 'REMEDY') return 'Remède';
  return 'Code';
}

function getTypeColor(type: FailureCodeType): string {
  if (type === 'PROBLEM') return C.orange;
  if (type === 'CAUSE') return C.blue;
  if (type === 'REMEDY') return C.green;
  return C.accent;
}

function getTypeIcon(type: FailureCodeType): string {
  if (type === 'PROBLEM') return 'alert-triangle';
  if (type === 'CAUSE') return 'search';
  if (type === 'REMEDY') return 'tool';
  return 'tag';
}

export default function FailureCodesList({
  title = 'Codes de panne',
  rows = [],
}: Props) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <FeatherIcon name="list" size={17} color={C.accent} />
        <Text style={styles.title}>{title}</Text>
      </View>

      {safeRows.length === 0 ? (
        <Text style={styles.emptyText}>Aucun code disponible.</Text>
      ) : (
        safeRows.map((row, index) => {
          const type = row?.type;
          const code = safeTrim(row?.code);
          const description = safeTrim(row?.description);
          const color = getTypeColor(type);

          return (
            <View key={`${type}-${code}-${index}`} style={styles.row}>
              <View style={[styles.iconBox, { borderColor: color }]}>
                <FeatherIcon name={getTypeIcon(type)} size={15} color={color} />
              </View>

              <View style={styles.rowContent}>
                <Text style={[styles.typeText, { color }]}>
                  {getTypeLabel(type)}
                </Text>

                <Text style={styles.codeText}>{code || '—'}</Text>

                {description ? (
                  <Text style={styles.descriptionText}>{description}</Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  title: {
    color: C.text,
    fontSize: 15,
    fontWeight: '900',
  },

  emptyText: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderAlt,
    padding: 12,
    marginBottom: 10,
  },

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },

  rowContent: {
    flex: 1,
  },

  typeText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },

  codeText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '900',
  },

  descriptionText: {
    marginTop: 3,
    color: C.textSub,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
});