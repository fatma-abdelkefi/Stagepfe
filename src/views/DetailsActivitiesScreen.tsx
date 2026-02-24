import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/AppNavigator';

import { AppIcon, AppText, Icons } from '../ui';
import { DetailsHeader, DetailsCard, DetailsEmptyState, detailsStyles } from '../ui/details';

import { useAuth } from '../context/AuthContext';
import StatusChangeModal from '../components/StatusChangeModal';

import { DEFAULT_ACTIVITY_DOMAIN_ID, FR_BY_CODE, normalizeMaximoHref } from '../services/statusService';

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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DetailsActivities'>;

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
    return `${n} Activité${n !== 1 ? 's' : ''}`;
  }, [activities.length]);

  const openChangeStatus = (activity: Activity) => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Identifiants manquants');
      return;
    }

    const rawHref = getHref(activity);
    const oslcHref = rawHref ? normalizeMaximoHref(rawHref) : '';

    setSelectedActivity({ ...activity, href: oslcHref });
    setStatusModalVisible(true);
  };

  const selectedHref = getHref(selectedActivity);
  const selectedStatus = String(selectedActivity?.status ?? selectedActivity?.statut ?? '').trim().toUpperCase();

  if (!workOrder) {
    return (
      <SafeAreaView style={detailsStyles.container} edges={['left', 'right', 'bottom']}>
        <DetailsHeader title="Activités" />
        <DetailsEmptyState text="Données de l'ordre de travail manquantes." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={detailsStyles.container} edges={['left', 'right', 'bottom']}>
      <DetailsHeader title="Activités" subtitle={`#${workOrder.wonum ?? 'N/A'}`} />

      <ScrollView style={detailsStyles.content} showsVerticalScrollIndicator={false}>
        {activities.length === 0 ? (
          <DetailsEmptyState text="Aucune activité pour cet ordre de travail" />
        ) : (
          <View style={detailsStyles.listContainer}>
            <AppText style={detailsStyles.sectionInfo}>{countText}</AppText>

            {activities.map((item: Activity, index: number) => {
              const statusCode = String(item?.status ?? item?.statut ?? '').trim().toUpperCase();
              const statusLabel = labelFR(statusCode);
              const taskKey = `${item?.taskid ?? 'na'}_${index}`;

              return (
                <DetailsCard key={taskKey}>
                  <View style={detailsStyles.cardHeader}>
                    <View style={detailsStyles.iconContainer}>
                      <AppIcon name={Icons.checkCircle} size={24} color="#3b82f6" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <AppText style={detailsStyles.title}>Activité {item?.taskid ?? 'N/A'}</AppText>

                      {!!item?.labhrs && <AppText style={detailsStyles.subtitle}>Durée : {item.labhrs} h</AppText>}

                      <AppText style={{ marginTop: 6, fontSize: 13, color: '#64748b', fontWeight: '700' }}>
                        Statut : <AppText style={{ color: '#0f172a', fontWeight: '900' }}>{statusLabel}</AppText>
                      </AppText>
                    </View>

                    <TouchableOpacity
                      onPress={() => openChangeStatus(item)}
                      style={detailsStyles.actionBtn}
                      activeOpacity={0.85}
                      disabled={opening}
                    >
                      {opening && String(selectedActivity?.taskid) === String(item?.taskid) ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <AppText style={detailsStyles.actionBtnText}>Changer status</AppText>
                      )}
                    </TouchableOpacity>
                  </View>

                  <AppText style={detailsStyles.description}>{item?.description || 'Aucune description'}</AppText>
                </DetailsCard>
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