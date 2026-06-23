import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../../app/navigation/types';
import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import Card from '../../../shared/components/layout/Card';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import { useWorkOrderFailureReport } from '../viewmodels/useWorkOrderFailureReport';
import { safeTrim } from '../utils/failureFormatters';

type Props = {
  route: RouteProp<RootStackParamList, 'FailureReportingDetails'>;
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  text: '#000000',
  textSub: '#8b92b0',
  textMuted: '#4b5272',
  danger: '#ef4444',
};

function formatDateTime(value?: string) {
  const text = safeTrim(value);
  if (!text) return '—';

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function displayCodeAndDescription(code?: string, description?: string) {
  const cleanCode = safeTrim(code);
  const cleanDescription = safeTrim(description);

  if (!cleanCode && !cleanDescription) return '—';

  if (cleanCode && cleanDescription && cleanCode !== cleanDescription) {
    return `${cleanCode} - ${cleanDescription}`;
  }

  return cleanCode || cleanDescription || '—';
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: string;
  label: string;
  value?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <View style={styles.infoHeader}>
        <FeatherIcon name={icon as any} size={15} color={C.accent} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>

      <Text style={styles.infoValue}>{safeTrim(value) || '—'}</Text>
    </View>
  );
}

export default function FailureReportingDetailsScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const params = route.params;

  const wonum = safeTrim(params?.wonum);
  const siteid = safeTrim(params?.siteid);

  const { data, loading, error } = useWorkOrderFailureReport(wonum, siteid);

  const failureClassText = displayCodeAndDescription(
    data?.failureClass,
    data?.failureClassDescription,
  );

  const problemText = displayCodeAndDescription(
    data?.problemCode || data?.problem,
    data?.problemDescription,
  );

  const causeText = displayCodeAndDescription(
    data?.causeCode || data?.cause,
    data?.causeDescription,
  );

  const remedyText = displayCodeAndDescription(
    data?.remedyCode || data?.remedy,
    data?.remedyDescription,
  );

  return (
    <ListDetailsLayout
      title="Failure Reporting"
      subtitle={`OT #${wonum || '—'}`}
      badgeText="Détails"
      onBack={() => navigation.goBack()}
      scroll
    >
      {loading ? (
        <Card style={styles.card}>
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.helperText}>
              Chargement du failure reporting...
            </Text>
          </View>
        </Card>
      ) : error ? (
        <Card style={styles.card}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <SectionLabel icon="alert-triangle" title="Résumé de la panne" />

            <InfoRow
              icon="database"
              label="Classe"
              value={failureClassText}
            />

            <InfoRow
              icon="alert-circle"
              label="Problème"
              value={problemText}
            />

            <InfoRow
              icon="search"
              label="Cause"
              value={causeText}
            />

            <InfoRow
              icon="tool"
              label="Remède"
              value={remedyText}
              last
            />
          </Card>

          <Card style={styles.card}>
            <SectionLabel icon="message-square" title="Remarque" />

            <Text style={styles.remarkText}>
              {safeTrim(data?.remark) || 'Aucune remarque disponible.'}
            </Text>
          </Card>

          <Card style={styles.smallCard}>
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Défaillance</Text>
                <Text style={styles.dateValue}>
                  {formatDateTime(data?.failureDate)}
                </Text>
              </View>

              <View style={styles.dateDivider} />

              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Remarque</Text>
                <Text style={styles.dateValue}>
                  {formatDateTime(data?.remarkDate)}
                </Text>
              </View>
            </View>
          </Card>
        </>
      )}
    </ListDetailsLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },

  smallCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },

  centerBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },

  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: C.textSub,
    fontWeight: '600',
  },

  errorBox: {
    paddingVertical: 4,
  },

  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '600',
  },

  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },

  infoLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  remarkText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 10,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dateItem: {
    flex: 1,
  },

  dateDivider: {
    width: 1,
    height: 34,
    backgroundColor: C.borderAlt,
    marginHorizontal: 12,
  },

  dateLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },

  dateValue: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: '700',
  },
});