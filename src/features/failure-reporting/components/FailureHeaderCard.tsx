import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Card from '../../../shared/components/layout/Card';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import { colors } from '../../../shared/theme/colors';
import { safeTrim } from '../utils/failureFormatters';

type Props = {
  wonum?: string;
  description?: string;
  status?: string;
  assetnum?: string;
  assetDescription?: string;
  location?: string;
  locationDescription?: string;
};

const C = {
  surface: '#111520',
  border: '#1e2235',
  accent: colors.primary,
  accentSoft: 'rgba(59,130,246,0.12)',
  accentMid: 'rgba(0, 0, 0, 0.25)',
  text: '#414547',
  textSub: '#8b92b0',
  textMuted: '#000000',
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <FeatherIcon name={icon as any} size={14} color={C.accent} />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{safeTrim(value) || '—'}</Text>
      </View>
    </View>
  );
}

export default function FailureHeaderCard({
  wonum,
  description,
  status,
  assetnum,
  assetDescription,
  location,
  locationDescription,
}: Props) {
  const assetFull = [safeTrim(assetnum), safeTrim(assetDescription)]
    .filter(Boolean)
    .join(' - ');

  const locationFull = [safeTrim(location), safeTrim(locationDescription)]
    .filter(Boolean)
    .join(' - ');

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Failure Reporting</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>OT #{safeTrim(wonum) || '—'}</Text>
        </View>
      </View>

      <SectionLabel icon="file-text" title="Work Order" />

      <View style={styles.body}>
        <InfoRow icon="align-left" label="Description" value={description} />
        <InfoRow icon="activity" label="Statut" value={status} />
        <InfoRow icon="package" label="Actif" value={assetFull} />
        <InfoRow icon="map-pin" label="Emplacement" value={locationFull} />
      </View>
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
  header: {
    marginBottom: 14,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accentMid,
  },
  badgeText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    gap: 12,
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accentSoft,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  infoValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
});