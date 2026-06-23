import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RouteProp,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import { useAuth } from '../../../app/providers/AuthProvider';

import { useWorkOrderDetailsViewModel } from '../viewmodels/useWorkOrderDetailsViewModel';
import WorkOrderDetailsHeader from '../components/WorkOrderDetailsHeader';
import WorkOrderSummaryCard from '../components/WorkOrderSummaryCard';
import WorkOrderSectionGrid from '../components/WorkOrderSectionGrid';
import WorkOrderDetailsState from '../components/WorkOrderDetailsState';

import ErrorModal from '../../../shared/components/feedback/ErrorModal';
import StatusChangeModal from '../../../shared/components/common/StatusChangeModal';

import { getWorkLogsForWonum } from '../../worklog/services/worklogService';

import {
  CATEGORY_SECTIONS,
  clamp,
  safeTrim,
  isFinalStatus,
  canAddPlannedMaterial,
  canAddActualMaterial,
  getBlockedAddMessage,
} from '../utils/workOrderDetails.helpers';

import { getFrenchStatusLabel } from '../../../shared/services/statusService';
import { enrichPlannedMaterialsWithBarcode } from '../../materials/services/plannedMaterialsService';

type Props = {
  route: RouteProp<RootStackParamList, 'WorkOrderDetails'>;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function mapDraftToSummary(draftWorkOrder: any, wonum: string, siteid: string) {
  if (!draftWorkOrder) return null;

  return {
    wonum: String(draftWorkOrder.wonum || wonum || '').trim(),
    href: draftWorkOrder.href || '',
    worklog_collectionref: draftWorkOrder.worklog_collectionref,
    description: draftWorkOrder.description || '',
    status: draftWorkOrder.status || 'WAPPR',

    siteid: String(
      draftWorkOrder.siteid ||
        siteid ||
        'BEDFORD',
    ).trim(),

    workorderid: draftWorkOrder.workorderid,

    asset: draftWorkOrder.asset || draftWorkOrder.assetnum || '',
    assetDescription:
      draftWorkOrder.assetDescription ||
      draftWorkOrder.asset_description ||
      '',

    location: draftWorkOrder.location || '',
    locationDescription: draftWorkOrder.locationDescription || '',

    scheduledStart:
      draftWorkOrder.scheduledStart ||
      draftWorkOrder.scheduled_start ||
      draftWorkOrder.schedstart ||
      draftWorkOrder.scheduledstart ||
      draftWorkOrder.targetstart ||
      null,

    scheduledFinish:
      draftWorkOrder.scheduledFinish ||
      draftWorkOrder.scheduled_finish ||
      draftWorkOrder.schedfinish ||
      draftWorkOrder.scheduledfinish ||
      draftWorkOrder.targetfinish ||
      null,

    isUrgent: Number(draftWorkOrder.priority || 0) === 1,
    completed: false,
    ishistory: false,

    priority: draftWorkOrder.priority,
    worktype: draftWorkOrder.worktype || '',
    reportedby: draftWorkOrder.reportedby || '',

    failureClass: '',
    failureCode: '',
    problem: '',
    problemCode: '',
    cause: '',
    causeCode: '',
    remedy: '',
    remedyCode: '',
    remark: '',
    failureRemarks: '',
    remarkdesc: '',

    activities: draftWorkOrder.activities || [],
    labor: draftWorkOrder.labor || draftWorkOrder.planned_labor || [],
    materials:
      draftWorkOrder.materials ||
      draftWorkOrder.planned_materials ||
      [],

    actualLabor: [],
    actualMaterials: [],
    docLinks: [],
    workLogs: [],

    hasfollowupwork: false,
  } as any;
}

function getScheduledStartFromAny(item: any) {
  return (
    item?.scheduledStart ||
    item?.scheduled_start ||
    item?.schedstart ||
    item?.scheduledstart ||
    item?.targetStart ||
    item?.target_start ||
    item?.targetstart ||
    item?.targstartdate ||
    null
  );
}

function getScheduledFinishFromAny(item: any) {
  return (
    item?.scheduledFinish ||
    item?.scheduled_finish ||
    item?.schedfinish ||
    item?.scheduledfinish ||
    item?.targetFinish ||
    item?.target_finish ||
    item?.targetfinish ||
    item?.targcompdate ||
    null
  );
}

function formatDateTimeFR(value: any) {
  if (!value) return 'Non planifié';

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export default function WorkOrderDetailsScreen({ route }: Props) {
  const woParam = route.params?.workOrder;
  const draftWorkOrder = route.params?.draftWorkOrder;

  const wonum = String(
    woParam?.wonum ||
      route.params?.wonum ||
      draftWorkOrder?.wonum ||
      '',
  ).trim();

  const siteid = String(
    woParam?.siteid ||
      route.params?.siteid ||
      draftWorkOrder?.siteid ||
      'BEDFORD',
  ).trim();

  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensionsSafe();
  const { username, password } = useAuth();

  const {
    summary,
    relatedWorkOrders,
    counts,
    loading,
    error,
    reload,
    updateSummaryStatus,
  } = useWorkOrderDetailsViewModel(wonum, siteid);

  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showError = useCallback((message: string, title = 'Erreur') => {
    setErrorModal({
      visible: true,
      title,
      message,
    });
  }, []);

  const closeError = useCallback(() => {
    setErrorModal(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (wonum && siteid) {
        reload();
      }

      return undefined;
    }, [reload, wonum, siteid]),
  );

  const layout = useMemo(() => {
    const sidePadding = clamp(Math.round(width * 0.05), 14, 24);
    const gap = clamp(Math.round(width * 0.03), 8, 12);
    const columns = 2;
    const contentWidth = width - sidePadding * 2;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cardHeight = clamp(cardWidth * 0.8, 112, 150);

    return { sidePadding, gap, cardWidth, cardHeight };
  }, [width]);

  const displaySummary = useMemo(() => {
    if (summary) return summary;

    return mapDraftToSummary(draftWorkOrder, wonum, siteid);
  }, [summary, draftWorkOrder, wonum, siteid]);

  const displayCounts = useMemo(() => {
    if (summary) return counts;

    return {
      activities: displaySummary?.activities?.length || 0,
      plannedLabor: displaySummary?.labor?.length || 0,
      plannedMaterials: displaySummary?.materials?.length || 0,
      actualLabor: displaySummary?.actualLabor?.length || 0,
      actualMaterials: displaySummary?.actualMaterials?.length || 0,
      doclinks: displaySummary?.docLinks?.length || 0,
      worklogs: displaySummary?.workLogs?.length || 0,
    };
  }, [summary, counts, displaySummary]);

  const statusLocked = useMemo(() => {
    const rawStatus = String(displaySummary?.status ?? '').trim().toUpperCase();
    return isFinalStatus(rawStatus);
  }, [displaySummary?.status]);

  const hasFailureReporting = useMemo(() => {
    if (!displaySummary) return false;

    return !!(
      safeTrim((displaySummary as any)?.failureClass) ||
      safeTrim((displaySummary as any)?.failurecode) ||
      safeTrim((displaySummary as any)?.problem) ||
      safeTrim((displaySummary as any)?.problemcode) ||
      safeTrim((displaySummary as any)?.cause) ||
      safeTrim((displaySummary as any)?.causecode) ||
      safeTrim((displaySummary as any)?.remedy) ||
      safeTrim((displaySummary as any)?.remedycode) ||
      safeTrim((displaySummary as any)?.remark) ||
      safeTrim((displaySummary as any)?.remarkdesc)
    );
  }, [displaySummary]);

  const plannedItemsWithBarcode = useMemo(() => {
    if (!displaySummary?.materials) return [];

    return displaySummary.materials.map((item: any, index: number) => ({
      id: item.id ?? `pm-${index}`,
      ...item,
    }));
  }, [displaySummary?.materials]);

  const getCategoryCount = useCallback(
    (category: string) => {
      switch (category) {
        case 'Activités':
          return displayCounts.activities;

        case "Main d'œuvre planifiée":
          return displayCounts.plannedLabor;

        case 'Matériel planifié':
          return displayCounts.plannedMaterials;

        case "Main d'œuvre réelle":
          return displayCounts.actualLabor;

        case 'Matériel réel':
          return displayCounts.actualMaterials;

        case 'Documents':
          return displayCounts.doclinks;

        case 'Work log':
          return displayCounts.worklogs;

        case "Détails de l'échec":
          return hasFailureReporting ? 1 : 0;

        case 'Ordres de travail liés':
          return relatedWorkOrders.length;

        default:
          return 0;
      }
    },
    [displayCounts, hasFailureReporting, relatedWorkOrders],
  );

  const isAddDisabled = useCallback(
    (categoryKey: string) => {
      if (!displaySummary) return true;

      if (categoryKey === 'Ordres de travail liés') {
        return false;
      }

      if (categoryKey === "Détails de l'échec") {
        return hasFailureReporting;
      }

      if (categoryKey === 'Matériel planifié') {
        return !canAddPlannedMaterial(
          displaySummary.status,
          displaySummary.ishistory,
        );
      }

      if (categoryKey === 'Matériel réel') {
        return !canAddActualMaterial(
          displaySummary.status,
          displaySummary.ishistory,
        );
      }

      if (categoryKey === "Main d'œuvre planifiée") {
        const s = String(displaySummary.status ?? '').trim().toUpperCase();
        return !!displaySummary.ishistory || s !== 'WAPPR';
      }

      if (categoryKey === "Main d'œuvre réelle") {
        const s = String(displaySummary.status ?? '').trim().toUpperCase();
        return !!displaySummary.ishistory || !(s === 'WAPPR' || s === 'INPRG');
      }

      return false;
    },
    [displaySummary, hasFailureReporting],
  );

  const handleCategoryPress = useCallback(
    async (categoryKey: string) => {
      if (!displaySummary) return;

      if (categoryKey === 'Ordres de travail liés') {
        navigation.navigate('RelatedWorkOrdersList', {
          wonum: String(displaySummary.wonum ?? ''),
          siteid: String(displaySummary.siteid ?? 'BEDFORD'),
          items: relatedWorkOrders,
        });
        return;
      }

      if (categoryKey === 'Activités') {
        const woHref = String(displaySummary.href ?? '').trim();

        navigation.navigate('ActivityList', {
          woHref,
          wonum: displaySummary.wonum,
          siteid: displaySummary.siteid,
          items: displaySummary.activities ?? [],
        });
        return;
      }

      if (categoryKey === 'Work log') {
        try {
          const wlPack = await getWorkLogsForWonum({
            wonum: String(displaySummary.wonum || ''),
            username: String(username || ''),
            password: String(password || ''),
          });

          navigation.navigate('WorkLogList', {
            title: 'Work log',
            wonum: displaySummary.wonum,
            items: wlPack.worklogs,
          });
        } catch (e) {
          console.log('[WORKLOG ERROR]', e);
          showError('Impossible de charger les work logs');
        }

        return;
      }

      if (categoryKey === "Détails de l'échec") {
  if (hasFailureReporting) {
    navigation.navigate('FailureReportingDetails', {
      title: 'Failure Reporting',
      wonum: String(displaySummary.wonum ?? ''),
      siteid: String(displaySummary.siteid ?? 'BEDFORD'),
    } as RootStackParamList['FailureReportingDetails']);
    return;
  }

  showError(
    "Aucun failure reporting n'est encore enregistré pour cet OT.",
    'Information',
  );
  return;
}

      if (categoryKey === "Main d'œuvre planifiée") {
        navigation.navigate('DetailsPlannedLabor', {
          workOrder: {
            wonum: displaySummary.wonum,
            labor: displaySummary.labor ?? [],
          },
        });
        return;
      }

      if (categoryKey === 'Matériel planifié') {
        try {
          const enriched = await enrichPlannedMaterialsWithBarcode({
            wonum: String(displaySummary.wonum ?? ''),
            items: plannedItemsWithBarcode,
          });

          navigation.navigate('MaterialsList', {
            title: 'Matériels planifiés',
            wonum: String(displaySummary.wonum ?? wonum),
            items: enriched,
            mode: 'planned',
          });
        } catch (e) {
          console.log('[PLANNED MATERIAL ERROR]', e);
          showError('Impossible de charger les matériels planifiés');
        }

        return;
      }

      if (categoryKey === 'Documents') {
        navigation.navigate('DoclinksList', {
          workOrder: {
            wonum: displaySummary.wonum,
            docLinks: displaySummary.docLinks ?? [],
          },
        });
        return;
      }

      if (categoryKey === 'Matériel réel') {
        navigation.navigate('MaterialsList', {
          title: 'Matériel réel',
          wonum: displaySummary.wonum,
          items: displaySummary.actualMaterials ?? [],
          mode: 'actual',
        });
        return;
      }

      navigation.navigate('DetailsActualLabor', {
        woHref: String(displaySummary.href ?? '').trim(),
        wonum: displaySummary.wonum,
      });
    },
    [
      navigation,
      showError,
      displaySummary,
      username,
      password,
      plannedItemsWithBarcode,
      wonum,
      relatedWorkOrders,
      hasFailureReporting,
    ],
  );

  const handlePlusPress = useCallback(
    (categoryKey: string) => {
      if (!displaySummary) return;

      if (categoryKey === 'Ordres de travail liés') {
        navigation.navigate('AddRelatedWorkOrder', {
          wonum: String(displaySummary.wonum ?? ''),
          siteid: String(displaySummary.siteid ?? 'BEDFORD'),
          description: String(displaySummary.description ?? ''),
          assetnum: String(
            (displaySummary as any)?.assetnum ??
              (displaySummary as any)?.asset ??
              (displaySummary as any)?.assetNumber ??
              '',
          ),
          asset_description: String(
            (displaySummary as any)?.asset_description ??
              (displaySummary as any)?.assetDescription ??
              (displaySummary as any)?.assetdesc ??
              '',
          ),
          location: String(
            (displaySummary as any)?.location ??
              (displaySummary as any)?.locationnum ??
              '',
          ),
          worktype: String((displaySummary as any)?.worktype ?? ''),
          priority: (displaySummary as any)?.priority ?? null,
          related_assets:
            (displaySummary as any)?.related_assets ??
            (displaySummary as any)?.relatedAssets ??
            (displaySummary as any)?.assets ??
            [],
        });
        return;
      }

      if (categoryKey === "Détails de l'échec") {
        if (hasFailureReporting) {
          showError(
            "Un failure reporting existe déjà pour cet OT.",
            'Information',
          );
          return;
        }

        navigation.navigate('FailureReporting', {
          wonum: String(displaySummary.wonum ?? ''),
          siteid: String(displaySummary.siteid ?? 'BEDFORD'),
          description: displaySummary.description,
          assetnum: displaySummary.asset,
          assetDescription: displaySummary.assetDescription,
          location: displaySummary.location,
          locationDescription: displaySummary.locationDescription,
          status: displaySummary.status,
          href: String(displaySummary.href ?? ''),
          woHref: String(displaySummary.href ?? ''),
          priority: Number((displaySummary as any)?.priority ?? 3),
          description_longdescription: String(
            (displaySummary as any)?.description_longdescription ?? '',
          ),
        } as RootStackParamList['FailureReporting']);
        return;
      }

      if (categoryKey === 'Documents') {
        navigation.navigate('AddDoclink', {
          ownerid: Number(displaySummary.workorderid ?? 0),
          siteid: String(displaySummary.siteid ?? 'BEDFORD'),
        });
        return;
      }

      if (categoryKey === 'Work log') {
        navigation.navigate('AddWorkLog', {
          wonum: displaySummary.wonum,
          worklogCollectionRef: displaySummary.worklog_collectionref,
          woHref: displaySummary.href,
        });
        return;
      }

      if (categoryKey === 'Matériel planifié') {
        const allowed = canAddPlannedMaterial(
          displaySummary.status,
          displaySummary.ishistory,
        );

        if (!allowed) {
          showError(
            getBlockedAddMessage(
              'plannedMaterial',
              displaySummary.status,
              displaySummary.ishistory,
            ),
            'Ajout non autorisé',
          );
          return;
        }

        navigation.navigate('AddPlannedMaterial', {
          wonum: displaySummary.wonum,
          workorderid: displaySummary.workorderid,
          siteid: displaySummary.siteid,
          status: displaySummary.status,
          ishistory: displaySummary.ishistory,
        });
        return;
      }

      if (categoryKey === 'Matériel réel') {
        const allowed = canAddActualMaterial(
          displaySummary.status,
          displaySummary.ishistory,
        );

        if (!allowed) {
          showError(
            getBlockedAddMessage(
              'actualMaterial',
              displaySummary.status,
              displaySummary.ishistory,
            ),
            'Ajout non autorisé',
          );
          return;
        }

        const woHref = String(displaySummary.href ?? '').trim();

        if (!woHref || !displaySummary.siteid) {
          showError('href OT ou siteid manquant');
          return;
        }

        navigation.navigate('AddActualMaterial', {
          wonum: displaySummary.wonum,
          siteid: displaySummary.siteid,
          woHref,
        });
        return;
      }

      if (categoryKey === "Main d'œuvre planifiée") {
        const s = String(displaySummary.status ?? '').trim().toUpperCase();
        const allowed = !displaySummary.ishistory && s === 'WAPPR';

        if (!allowed) {
          showError(
            `Ajout de main d'œuvre planifiée interdit pour le statut OT (${s || 'INCONNU'}).`,
            'Ajout non autorisé',
          );
          return;
        }

        navigation.navigate('AddPlannedLabor', {
          wonum: displaySummary.wonum,
          workorderid: displaySummary.workorderid,
          siteid: displaySummary.siteid,
          status: displaySummary.status,
          ishistory: displaySummary.ishistory,
        });
        return;
      }

      if (categoryKey === "Main d'œuvre réelle") {
        const s = String(displaySummary.status ?? '').trim().toUpperCase();
        const allowed = !displaySummary.ishistory && (s === 'WAPPR' || s === 'INPRG');

        if (!allowed) {
          showError(
            `Ajout de main d'œuvre réelle interdit pour le statut OT (${s || 'INCONNU'}).`,
            'Ajout non autorisé',
          );
          return;
        }

        const woHref = String(displaySummary.href ?? '').trim();

        if (!woHref || !displaySummary.siteid) {
          showError('href OT ou siteid manquant');
          return;
        }

        navigation.navigate('AddActualLabor', {
          wonum: displaySummary.wonum,
          siteid: displaySummary.siteid,
          woHref,
        });
      }
    },
    [navigation, displaySummary, hasFailureReporting, showError],
  );

  if (!wonum) {
    return (
      <>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0f1e' }}>
          <WorkOrderDetailsState
            type="error"
            message="Paramètres manquants (workOrder / wonum)."
            onRetry={() => navigation.goBack()}
          />
        </SafeAreaView>

        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          onClose={closeError}
        />
      </>
    );
  }

  if (loading && !displaySummary) {
    return (
      <>
        <WorkOrderDetailsState type="loading" />

        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          onClose={closeError}
        />
      </>
    );
  }

  if ((error && !displaySummary) || !displaySummary) {
    return (
      <>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0f1e' }}>
          <WorkOrderDetailsState
            type="error"
            message={error || 'Aucune donnée disponible'}
            onRetry={reload}
          />
        </SafeAreaView>

        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          onClose={closeError}
        />
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0f1e' }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 18 }}
        >
          <WorkOrderDetailsHeader
            sidePadding={layout.sidePadding}
            onBack={() => navigation.goBack()}
          >
            <TouchableOpacity
              activeOpacity={statusLocked ? 1 : 0.92}
              disabled={statusLocked}
              onPress={() => setStatusModalVisible(true)}
            >
              <WorkOrderSummaryCard
                wonum={displaySummary.wonum}
                description={displaySummary.description || ''}
                status={getFrenchStatusLabel(
                  displaySummary.status,
                  displaySummary.status || '',
                )}
                isUrgent={displaySummary.isUrgent}
                statusLocked={statusLocked}
                asset={safeTrim(displaySummary.asset || '')}
                assetDescription={safeTrim(displaySummary.assetDescription || '')}
                location={safeTrim(displaySummary.location || '')}
                locationDescription={safeTrim(displaySummary.locationDescription || '')}
                scheduledStart={formatDateTimeFR(
                  getScheduledStartFromAny(displaySummary) ||
                    getScheduledStartFromAny(woParam) ||
                    getScheduledStartFromAny(draftWorkOrder)
                )}
                scheduledFinish={formatDateTimeFR(
                  getScheduledFinishFromAny(displaySummary) ||
                    getScheduledFinishFromAny(woParam) ||
                    getScheduledFinishFromAny(draftWorkOrder)
                )}
              />
            </TouchableOpacity>
          </WorkOrderDetailsHeader>

          <View style={{ paddingHorizontal: layout.sidePadding, paddingTop: 10 }}>
            <WorkOrderSectionGrid
              sections={CATEGORY_SECTIONS}
              getCategoryCount={getCategoryCount}
              onCategoryPress={handleCategoryPress}
              onPlusPress={handlePlusPress}
              isAddDisabled={isAddDisabled}
              cardWidth={layout.cardWidth}
              cardHeight={layout.cardHeight}
              gap={layout.gap}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <StatusChangeModal
        visible={statusModalVisible}
        entityType="WO"
        currentStatus={displaySummary.status || ''}
        href={displaySummary.href || ''}
        wonum={displaySummary.wonum || wonum}
        siteid={displaySummary.siteid || siteid || 'BEDFORD'}
        username={username || ''}
        password={password || ''}
        locked={statusLocked}
        onClose={() => setStatusModalVisible(false)}
        onSuccess={({ code }) => {
          updateSummaryStatus(code);
          setStatusModalVisible(false);
          reload();
        }}
      />

      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeError}
      />
    </>
  );
}

function useWindowDimensionsSafe() {
  const dims = require('react-native').useWindowDimensions();
  return dims;
}