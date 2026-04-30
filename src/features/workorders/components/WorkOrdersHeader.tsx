import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../../../shared/components/typography/AppText';

type Props = {
  todayCount: number;
  selectedDate: Date | null;
  formatDate: (date: string) => string;
  onOpenCalendar: () => void;
  onLogout: () => void;
};

export default function WorkOrdersHeader({
  todayCount,
  selectedDate,
  formatDate,
  onOpenCalendar,
  onLogout,
}: Props) {
  return (
    <LinearGradient
      colors={['#0f1e35', '#1a2e4a', '#1e3a5f']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.topRow}>
        <View>
          <AppText style={styles.title}>Ordres de travail</AppText>
          <AppText style={styles.subtitle}>
            {selectedDate
              ? formatDate(selectedDate.toISOString())
              : 'Tâches du jour'}
          </AppText>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
            <FeatherIcon name="bell" size={18} color="#fff" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onLogout}
            activeOpacity={0.8}
          >
            <FeatherIcon name="log-out" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsLeft}>
          <AppText style={styles.statsCount}>{todayCount}</AppText>
          <AppText style={styles.statsLabel}>ordres aujourd'hui</AppText>
        </View>

        <View style={styles.statsRight}>
          <TouchableOpacity
            style={styles.calendarPill}
            onPress={onOpenCalendar}
            activeOpacity={0.8}
          >
            <FeatherIcon
              name="calendar"
              size={16}
              color={selectedDate ? '#22c55e' : '#60a5fa'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 3,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#0f1e35',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statsLeft: {
    gap: 2,
  },
  statsCount: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
  statsLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRight: {
    alignItems: 'flex-end',
  },
  calendarPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});