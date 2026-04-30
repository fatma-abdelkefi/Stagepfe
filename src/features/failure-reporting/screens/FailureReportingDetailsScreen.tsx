import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import type { RootStackParamList } from '../../../app/navigation/types';
import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import FailureHeaderCard from '../components/FailureHeaderCard';
import FailureCodesList from '../components/FailureCodesList';
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
  text: '#3d6aff',
  textSub: '#ffffff',
  textMuted: '#4b5272',
  danger: '#ef4444',
};

function InfoBlock({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueBox}>
        <Text style={styles.infoValue}>{safeTrim(value) || '—'}</Text>
      </View>
    </View>
  );
}

export default function FailureReportingDetailsScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const params = route.params;

  const wonum = safeTrim(params?.wonum);
  const siteid = safeTrim(params?.siteid);

  const { data, loading, error } = useWorkOrderFailureReport(wonum, siteid);
  const rows = useMemo(() => data?.codes || [], [data]);

  return (
    <ListDetailsLayout
      title="Failure Reporting"
      subtitle={`OT #${wonum || '—'}`}
      badgeText="Détails"
      onBack={() => navigation.goBack()}
      scroll
    >
      <FailureHeaderCard
        wonum={params?.wonum}
        description={params?.description}
        status={params?.status}
        assetnum={params?.assetnum}
        assetDescription={params?.assetDescription}
        location={params?.location}
        locationDescription={params?.locationDescription}
      />

      {loading ? (
        <Card style={styles.card}>
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.helperText}>Chargement du failure reporting...</Text>
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
            <SectionLabel icon="database" title="Classe de panne" />

            <InfoBlock label="Code" value={data?.failureClass} />
            <InfoBlock label="Description" value={data?.failureClassDescription} />
            <InfoBlock label="Date de défaillance" value={data?.failureDate} />
            <InfoBlock label="Date de remarque" value={data?.remarkDate} />
            <InfoBlock label="Remarque" value={data?.remark} />
          </Card>

          <FailureCodesList title="Codes de panne existants" rows={rows} />
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
  infoBlock: {
    marginTop: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  infoValueBox: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  infoValue: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    fontWeight: '600',
  },
});