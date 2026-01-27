import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useWorkOrderDetails } from '../viewmodels/WorkOrderDetailsViewModel';

type Props = {
  route: RouteProp<RootStackParamList, 'WorkOrderDetails'>;
};

export default function WorkOrderDetailsScreen({ route }: Props) {
  const { workOrder } = route.params;

  const {
    workOrder: details,
    loading,
    error,
    formatDate,
    calculateDuration,
  } = useWorkOrderDetails(workOrder.wonum);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={40} color="#EF4444" />
        <Text style={styles.error}>{error}</Text>
      </View>
    );

  if (!details)
    return (
      <View style={styles.center}>
        <Text>Aucune donnée disponible</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.woLabel}>Ordre de travail</Text>
        <Text style={styles.woNumber}>WO {details.wonum}</Text>

        {/* Badge Urgent / Terminé */}
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          {details.isUrgent && !details.completed && (
            <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.badgeText}>URGENT</Text>
            </View>
          )}
          {!details.isUrgent && details.completed && (
            <View style={[styles.badge, { backgroundColor: '#22C55E' }]}>
              <Text style={styles.badgeText}>TERMINÉ</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={styles.description}>
          {details.description || 'Aucune description'}
        </Text>
      </View>

      {/* GENERAL INFO */}
      <Card title="Informations générales" icon="info">
        <InfoRow label="Statut" value={details.status} />
        <InfoRow label="Site" value={details.site} />
        <InfoRow label="Type" value={details.workType} />
        <InfoRow label="GL Account" value={details.glAccount} />
      </Card>

      {/* LOCATION */}
      <Card title="Localisation & Actif" icon="map-pin">
        <InfoRow label="Emplacement" value={details.location} />
        <InfoRow label="Actif" value={details.asset} />
      </Card>

      {/* TIME */}
      <Card title="Temps d’exécution" icon="clock">
        <TimelineItem
          title="Début réel"
          value={formatDate(details.actualStart)}
          icon="play"
        />

        <TimelineSeparator />

        <TimelineItem
          title="Fin réelle"
          value={formatDate(details.actualFinish)}
          icon="stop"
        />

        <View style={styles.durationCard}>
          <Feather name="activity" size={18} color="#2563EB" />
          <Text style={styles.durationLabel}>Durée totale</Text>
          <Text style={styles.durationValue}>
            {calculateDuration(details.actualStart, details.actualFinish)}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

/* ================= COMPONENTS ================= */

const Card = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Feather name={icon} size={18} color="#2563EB" />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '-'}</Text>
  </View>
);

const TimelineItem = ({
  title,
  value,
  icon,
}: {
  title: string;
  value?: string;
  icon: string;
}) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineIcon}>
      <Feather name={icon} size={18} color="#2563EB" />
    </View>
    <View>
      <Text style={styles.timelineTitle}>{title}</Text>
      <Text style={styles.timelineValue}>{value || '-'}</Text>
    </View>
  </View>
);

const TimelineSeparator = () => <View style={styles.timelineLine} />;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  error: {
    marginTop: 12,
    color: '#EF4444',
    fontSize: 16,
  },

  /* HEADER */
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },

  woLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  woNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2563EB',
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },

  description: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
    lineHeight: 22,
  },

  /* BADGE */
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* CARD */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  label: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  value: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },

  /* TIMELINE */
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  timelineValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },

  timelineLine: {
    height: 20,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginLeft: 17,
    marginVertical: 6,
  },

  /* DURATION */
  durationCard: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },

  durationValue: {
    marginLeft: 'auto',
    fontSize: 16,
    fontWeight: '900',
    color: '#2563EB',
  },
});
