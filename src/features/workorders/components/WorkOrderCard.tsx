import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { WorkOrder } from '../types/workOrder.types';

type Props = {
  item: WorkOrder;
  onPress: () => void;
  formatDate: (date: string) => string;
};

function getStatusBadge(status: string) {
  const upper = (status || '').toUpperCase();
  switch (upper) {
    case 'COMP':
    case 'CLOSE':
      return { label: 'Terminé', color: '#10b981' };
    case 'WAPPR':
      return { label: 'En attente', color: '#f59e0b' };
    case 'APPR':
      return { label: 'Approuvé', color: '#64748b' };
    case 'CAN':
    case 'CANC':
      return { label: 'Annulé', color: '#ef4444' };
    default:
      return { label: 'En cours', color: '#3b82f6' };
  }
}

export default function WorkOrderCard({ item, onPress, formatDate }: Props) {
  const status = getStatusBadge(item.status);

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.7}>
      <View style={[styles.statusStrip, { backgroundColor: status.color }]} />

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.wonumBadge}>
            <Text style={styles.wonumText}>{item.wonum}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${status.color}22` }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusBadgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoValue}>
              {item.asset?.trim() ? item.asset : 'Actif non renseigné'}
            </Text>
            <Text style={styles.infoDescription}>
              {item.assetDescription?.trim()
                ? item.assetDescription
                : 'Aucune description'}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoValue}>
              {item.location?.trim()
                ? item.location
                : 'Emplacement non renseigné'}
            </Text>
            <Text style={styles.infoDescription}>
              {item.locationDescription?.trim()
                ? item.locationDescription
                : 'Aucune description'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.scheduledDateText}>
            {item.scheduledStart ? formatDate(item.scheduledStart) : 'Non planifié'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
    gap: 8,
  },
  wonumBadge: {
    backgroundColor: 'rgba(96,165,250,0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.25)',
  },
  wonumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60a5fa',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  infoBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 10,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 13,
  },
  cardFooter: {
    width: '100%',
    alignItems: 'flex-end',
  },
  scheduledDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
});