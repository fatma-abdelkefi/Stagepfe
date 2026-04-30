import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { isFinalStatus } from '../utils/workOrderDetails.helpers';
import { getFrenchStatusLabel } from '../../../shared/services/statusService';

type Props = {
  wonum: string;
  description: string;
  status: string;
  isUrgent: boolean;
  statusLocked: boolean;
  asset: string;
  assetDescription: string;
  location: string;
  locationDescription: string;
  scheduledStart: string;
  scheduledFinish: string;
};

export default function WorkOrderSummaryCard({
  wonum,
  description,
  status,
  isUrgent,
  statusLocked,
  asset,
  assetDescription,
  location,
  locationDescription,
  scheduledStart,
  scheduledFinish,
}: Props) {const isLocked = isFinalStatus(String(status ?? '').trim().toUpperCase());
  return (
    <View style={styles.woCard}>
      <View style={styles.woHeader}>
        <View>
          <Text style={styles.woLabel}>Ordre de travail</Text>
          <Text style={styles.woNumber}>#{wonum}</Text>
        </View>

        <View style={styles.badgesRow}>
          {isUrgent && !statusLocked && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(220,38,38,0.2)' }]}>
              <FeatherIcon name="alert-circle" size={13} color="#f87171" />
              <Text style={[styles.statusBadgeText, { color: '#f87171' }]}>Urgent</Text>
            </View>
          )}

          <View style={styles.statusReadOnly}>
            {isLocked && (
              <FeatherIcon name="lock" size={12} color="#60a5fa" />
            )}

            <Text style={styles.statusReadOnlyText}>
              {getFrenchStatusLabel(status, status || '—')}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.description}>{description || 'Aucune description'}</Text>

      <View style={styles.infoLine}>
        <FeatherIcon name="tool" size={14} color="#60a5fa" />
        <View style={styles.infoLineText}>
          <Text style={styles.infoValue}>{asset || 'Non renseigné'}</Text>
          <Text style={styles.infoSubValue}>{assetDescription || 'Aucune description'}</Text>
        </View>
      </View>

      <View style={styles.infoLine}>
        <FeatherIcon name="map-pin" size={14} color="#60a5fa" />
        <View style={styles.infoLineText}>
          <Text style={styles.infoValue}>{location || 'Emplacement non renseigné'}</Text>
          <Text style={styles.infoSubValue}>{locationDescription || 'Aucune description'}</Text>
        </View>
      </View>

      <View style={styles.datesRow}>
        <View style={styles.dateItem}>
          <FeatherIcon name="calendar" size={13} color="#60a5fa" />
          <View style={styles.dateTextWrap}>
            <Text style={styles.dateLabel}>Début prévu</Text>
            <Text style={styles.dateValue}>{scheduledStart}</Text>
          </View>
        </View>

        <View style={styles.dateItem}>
          <FeatherIcon name="check-square" size={13} color="#60a5fa" />
          <View style={styles.dateTextWrap}>
            <Text style={styles.dateLabel}>Fin prévue</Text>
            <Text style={styles.dateValue}>{scheduledFinish}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  woCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  woHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  woLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  woNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#60a5fa',
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusReadOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderWidth: 1.3,
    borderColor: 'rgba(96,165,250,0.35)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
  },
  statusReadOnlyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60a5fa',
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    color: '#e2e8f0',
    lineHeight: 18,
    marginBottom: 6,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  infoLineText: {
    flex: 1,
    minWidth: 0,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f1f5f9',
    lineHeight: 14,
  },
  infoSubValue: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 13,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  dateTextWrap: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    lineHeight: 12,
  },
  dateValue: {
    fontSize: 11,
    color: '#f1f5f9',
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 1,
  },
});