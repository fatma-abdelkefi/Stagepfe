////////////////////////////////////////////////////////////////////////////////
// ✅ FULL UPDATED src/views/DetailsActivitiesScreen.tsx
////////////////////////////////////////////////////////////////////////////////

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { AppIcon, AppText, Icons } from '../ui';
import { useAuth } from '../context/AuthContext';
import StatusChangeModal from '../components/StatusChangeModal';

import {
  DEFAULT_ACTIVITY_DOMAIN_ID,
  FR_BY_CODE,
  normalizeMaximoHref,
} from '../services/statusService';

type Activity = {
  taskid?: number | string;
  description?: string;
  labhrs?: number | string;
  status?: string;
  statut?: string;
  href?: string | { href?: string };
  _href?: string;
  siteid?: string;
  wonum?: string;
  workorderid?: number;
  [k: string]: any;
};

type Props = {
  route: RouteProp<RootStackParamList, 'DetailsActivities'>;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DetailsActivities'
>;

function getHref(activity: Activity | null | undefined): string {
  if (!activity) return '';
  const h = activity.href;
  if (typeof h === 'string') return h.trim();
  if (h && typeof h === 'object' && typeof h.href === 'string') return h.href.trim();
  if (typeof activity._href === 'string') return activity._href.trim();
  return '';
}

function labelFR(code?: string): string {
  const c = String(code ?? '').trim().toUpperCase();
  if (!c) return '-';
  return FR_BY_CODE[c] || c;
}

export default function DetailsActivitiesScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { username, password } = useAuth();

  const workOrder = route?.params?.workOrder ?? null;

  const rawActivities: Activity[] = Array.isArray(workOrder?.activities)
    ? (workOrder.activities as Activity[])
    : [];

  const [activities, setActivities] = useState<Activity[]>(rawActivities);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [opening, setOpening] = useState(false);

  const countText = useMemo(() => {
    const n = activities.length;
    return `${n} activité${n !== 1 ? 's' : ''}`;
  }, [activities.length]);

  const openChangeStatus = (activity: Activity) => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Identifiants manquants');
      return;
    }

    // Keep only for debug (resolver does the real job)
    const rawHref = getHref(activity);
    const oslcHref = rawHref ? normalizeMaximoHref(rawHref) : '';

    setSelectedActivity({ ...activity, href: oslcHref });
    setStatusModalVisible(true);
  };

  const selectedHref = getHref(selectedActivity);
  const selectedStatus = String(selectedActivity?.status ?? selectedActivity?.statut ?? '').trim().toUpperCase();

  if (!workOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.9}>
            <AppIcon name={Icons.back} size={24} color="#fff" />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>Activités</AppText>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.emptyContainer}>
          <AppIcon name={Icons.inbox} size={64} color="#cbd5e1" />
          <AppText style={styles.emptyText}>Données de l'ordre de travail manquantes.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.9}>
          <AppIcon name={Icons.back} size={24} color="#fff" />
        </TouchableOpacity>

        <AppText style={styles.headerTitle}>Activités - #{workOrder.wonum ?? 'N/A'}</AppText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AppIcon name={Icons.inbox} size={64} color="#cbd5e1" />
            <AppText style={styles.emptyText}>Aucune activité pour cet ordre de travail</AppText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <AppText style={styles.sectionInfo}>{countText}</AppText>

            {activities.map((item: Activity, index: number) => {
              const statusCode = String(item?.status ?? item?.statut ?? '').trim().toUpperCase();
              const statusLabel = labelFR(statusCode);
              const taskKey = `${item?.taskid ?? 'na'}_${index}`;

              return (
                <View key={taskKey} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.iconContainer}>
                      <AppIcon name={Icons.checkCircle} size={24} color="#3b82f6" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <AppText style={styles.title}>Activité {item?.taskid ?? 'N/A'}</AppText>

                      {!!item?.labhrs && <AppText style={styles.subtitle}>Durée : {item.labhrs} h</AppText>}

                      <AppText style={styles.statusLine}>
                        Statut : <AppText style={styles.statusValue}>{statusLabel}</AppText>
                      </AppText>
                    </View>

                    <TouchableOpacity
                      onPress={() => openChangeStatus(item)}
                      style={styles.changeBtn}
                      activeOpacity={0.85}
                      disabled={opening}
                    >
                      {opening && String(selectedActivity?.taskid) === String(item?.taskid) ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <AppText style={styles.changeBtnText}>Changer</AppText>
                      )}
                    </TouchableOpacity>
                  </View>

                  <AppText style={styles.description}>{item?.description || 'Aucune description'}</AppText>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <StatusChangeModal
        visible={statusModalVisible}
        entityType="ACTIVITY"
        currentStatus={selectedStatus}
        href={selectedHref}
        username={username || ''}
        password={password || ''}
        activityDomainId={DEFAULT_ACTIVITY_DOMAIN_ID}
        activityCtx={{
          taskid: selectedActivity?.taskid,
          wonum: selectedActivity?.wonum ?? workOrder?.wonum,
          siteid: selectedActivity?.siteid ?? workOrder?.siteid,
          workorderid: selectedActivity?.workorderid ?? workOrder?.workorderid,
        }}
        onClose={() => setStatusModalVisible(false)}
        onSuccess={({ code }) => {
          if (!selectedActivity) return;
          setActivities((prev) =>
            prev.map((a) =>
              String(a?.taskid) === String(selectedActivity?.taskid) ? { ...a, status: code, statut: code } : a
            )
          );
          Alert.alert('Succès', `Statut activité changé vers : ${labelFR(code)}`);
          setStatusModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#3b82f6',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 16 },
  sectionInfo: { fontSize: 15, fontWeight: '600', color: '#64748b', marginBottom: 16 },
  listContainer: { paddingBottom: 24 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#3b82f6', marginTop: 4, fontWeight: '600' },
  statusLine: { marginTop: 6, fontSize: 13, color: '#64748b', fontWeight: '700' },
  statusValue: { color: '#0f172a', fontWeight: '900' },
  changeBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  changeBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  description: { fontSize: 15, color: '#334155', lineHeight: 22 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 120 },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
});