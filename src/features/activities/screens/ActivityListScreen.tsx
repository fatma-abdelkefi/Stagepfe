import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useActivityListViewModel } from '../viewmodels/useActivityListViewModel';
import type { ActivityItem } from '../types/activity.types';

import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import ListItemCard from '../../../shared/ui/list-details/ListItemCard';
import ListEmptyState from '../../../shared/ui/list-details/ListEmptyState';

import { useAuth } from '../../../app/providers/AuthProvider';
import StatusChangeModal from '../../../shared/components/common/StatusChangeModal';
import {
  DEFAULT_ACTIVITY_DOMAIN_ID,
  FR_BY_CODE,
} from '../../../shared/services/statusService';

function getHref(activity: any): string {
  if (!activity) return '';

  const h = activity.href;

  if (typeof h === 'string') return h.trim();
  if (h && typeof h === 'object' && typeof h.href === 'string') {
    return h.href.trim();
  }
  if (typeof activity._href === 'string') return activity._href.trim();
  if (typeof activity['rdf:about'] === 'string') return activity['rdf:about'].trim();

  return '';
}

function labelFR(code?: string): string {
  const c = String(code ?? '').trim().toUpperCase();
  if (!c) return '-';
  return FR_BY_CODE?.[c] || c;
}

function isClosedStatus(status?: string): boolean {
  const s = String(status ?? '').trim().toUpperCase();
  return ['COMP', 'CLOSE', 'CLOSED', 'CAN', 'CANCEL', 'CANCELLED', 'HISTEDIT'].includes(s);
}

export default function ActivityListScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { username, password } = useAuth();

  const { activities, loading, error, refresh } = useActivityListViewModel(route.params);
  const wonum = route.params?.wonum; 

  const [localActivities, setLocalActivities] = useState<ActivityItem[]>([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  const displayedActivities = useMemo(() => {
    return localActivities.length > 0 ? localActivities : activities;
  }, [activities, localActivities]);

  const workOrderCtx = route.params || {};

  const openChangeStatus = (activity: ActivityItem) => {
    console.log('[ACTIVITY] clicked item =', activity);

    if (!username || !password) {
      Alert.alert('Erreur', 'Identifiants manquants');
      return;
    }

    const taskid = String(activity?.taskid ?? '').trim();
    if (!taskid) {
      Alert.alert('Erreur', 'taskid manquant sur cette activité');
      return;
    }

    const rawHref = getHref(activity);

    setSelectedActivity({
      ...activity,
      taskid,
      href: rawHref,
      wonum: activity?.wonum || workOrderCtx?.wonum || '',
      siteid: activity?.siteid || workOrderCtx?.siteid || '',
      workorderid: activity?.workorderid || '',
    });

    setStatusModalVisible(true);
  };

  const selectedStatus = String(selectedActivity?.status ?? '').trim().toUpperCase();
  const selectedLocked = isClosedStatus(selectedStatus);

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const statusCode = String(item?.status ?? '').trim().toUpperCase();
    const statusLabel = labelFR(statusCode);
    const locked = isClosedStatus(statusCode);

    const metaParts = [
      item.taskid ? `tâche: ${item.taskid}` : '',
      item.asset ? `Asset: ${item.asset}` : '',
      item.location ? `Location: ${item.location}` : '',
    ].filter(Boolean);

    return (
      <View style={styles.cardContainer}>
        <View style={{ flex: 1 }}>
          <ListItemCard
            icon="clipboard"
            title={item.taskid ? `Activité ${item.taskid}` : item.wonum || 'Activité'}
            subtitle={item.description || 'Sans description'}
            meta={metaParts.join(' • ')}
          />
        </View>

        <TouchableOpacity
          onPress={() => !locked && openChangeStatus(item)}
          activeOpacity={locked ? 1 : 0.85}
          disabled={locked}
          style={[
            styles.inlineStatusButton,
            locked ? styles.inlineStatusButtonLocked : styles.inlineStatusButtonActive,
          ]}
        >
          <Text style={locked ? styles.inlineStatusButtonTextLocked : styles.inlineStatusButtonText}>
            {locked ? 'Clôturé' : statusLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ListDetailsLayout
        title="Activités"
        subtitle={`OT #${wonum || '-'}`}
        badgeText={`${activities.length} élément${activities.length > 1 ? 's' : ''}`}
        onBack={() => navigation.goBack()}
        scroll={false}
      >
        {loading ? (
          <View style={styles.center}>
            <Text>Chargement...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text>Erreur de chargement</Text>
          </View>
        ) : (
          <FlatList
            data={displayedActivities}
            keyExtractor={(item, index) => String(item.id ?? item.taskid ?? index)}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingBottom: displayedActivities.length === 0 ? 0 : 12,
              flexGrow: displayedActivities.length === 0 ? 1 : 0,
            }}
            ListEmptyComponent={<ListEmptyState title="Aucune activité" />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ListDetailsLayout>

      <StatusChangeModal
        visible={statusModalVisible}
        entityType="ACTIVITY"
        currentStatus={selectedStatus}
        href={selectedActivity?.href || ''}
        username={username || ''}
        password={password || ''}
        locked={selectedLocked}
        activityDomainId={DEFAULT_ACTIVITY_DOMAIN_ID}
        activityCtx={{
          taskid: selectedActivity?.taskid,
          wonum: selectedActivity?.wonum || workOrderCtx?.wonum,
          siteid: selectedActivity?.siteid || workOrderCtx?.siteid,
          workorderid: selectedActivity?.workorderid,
          href: selectedActivity?.href || '',
        }}
        onClose={() => setStatusModalVisible(false)}
        onSuccess={({ code }) => {
          if (!selectedActivity) return;

          const source = localActivities.length > 0 ? localActivities : activities;

          setLocalActivities(
            source.map((a) =>
              String(a?.id) === String(selectedActivity?.id)
                ? { ...a, status: code }
                : a,
            ),
          );

          Alert.alert('Succès', `Statut activité changé vers : ${labelFR(code)}`);
          setStatusModalVisible(false);
          refresh?.();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
   inlineStatusButton: {
    position: 'absolute',
    right: 12,
    top: 10,          
    minWidth: 70,     
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineStatusButtonActive: {
    backgroundColor: '#181818',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  inlineStatusButtonLocked: {
    backgroundColor: '#a2a8ad',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  inlineStatusButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  inlineStatusButtonTextLocked: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
});