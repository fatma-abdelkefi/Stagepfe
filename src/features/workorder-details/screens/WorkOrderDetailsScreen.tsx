  import React, { useCallback, useMemo, useState } from 'react';
  import {
    View,
    ScrollView,
    TouchableOpacity,
    Pressable,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
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
  import AppText from '../../../shared/components/typography/AppText';

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

  export default function WorkOrderDetailsScreen({ route }: Props) {
    const woParam = route.params?.workOrder;
    const wonum = woParam?.wonum;
    const siteid = woParam?.siteid;

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

    const [currentStatus] = useState(woParam?.status ?? '');
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

    const layout = useMemo(() => {
      const sidePadding = clamp(Math.round(width * 0.05), 14, 24);
      const gap = clamp(Math.round(width * 0.03), 8, 12);
      const columns = 2;
      const contentWidth = width - sidePadding * 2;
      const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
      const cardHeight = clamp(cardWidth * 0.8, 112, 150);

      return { sidePadding, gap, cardWidth, cardHeight };
    }, [width]);

    const statusLocked = useMemo(() => {
      const rawStatus = String(summary?.status ?? '').trim().toUpperCase();
      return isFinalStatus(rawStatus);
    }, [summary?.status]);

    const hasFailureReporting = useMemo(() => {
      if (!summary) return false;

      return !!(
        safeTrim((summary as any)?.failureClass) ||
        safeTrim((summary as any)?.problem) ||
        safeTrim((summary as any)?.cause) ||
        safeTrim((summary as any)?.remedy) ||
        safeTrim((summary as any)?.remark)
      );
    }, [summary]);

    const plannedItemsWithBarcode = useMemo(() => {
      if (!summary?.materials) return [];

      return summary.materials.map((item: any, index: number) => ({
        id: item.id ?? `pm-${index}`,
        ...item,
      }));
    }, [summary?.materials]);

    const getCategoryCount = useCallback(
      (category: string) => {
        switch (category) {
          case 'Activités':
            return counts.activities;
          case "Main d'œuvre planifiée":
            return counts.plannedLabor;
          case 'Matériel planifié':
            return counts.plannedMaterials;
          case "Main d'œuvre réelle":
            return counts.actualLabor;
          case 'Matériel réel':
            return counts.actualMaterials;
          case 'Documents':
            return counts.doclinks;
          case 'Work log':
            return counts.worklogs;
          case "Détails de l'échec":
            return hasFailureReporting ? 1 : 0;
          case 'Ordres de travail liés':
            return relatedWorkOrders.length;
          default:
            return 0;
        }
      },
      [counts, hasFailureReporting, relatedWorkOrders],
    );

    const isAddDisabled = useCallback(
      (categoryKey: string) => {
        if (!summary) return true;

        if (categoryKey === 'Ordres de travail liés') {
          return false;
        }

        if (categoryKey === "Détails de l'échec") {
          return hasFailureReporting;
        }

        if (categoryKey === 'Matériel planifié') {
          return !canAddPlannedMaterial(summary.status, summary.ishistory);
        }

        if (categoryKey === 'Matériel réel') {
          return !canAddActualMaterial(summary.status, summary.ishistory);
        }

        if (categoryKey === "Main d'œuvre planifiée") {
          const s = String(summary.status ?? '').trim().toUpperCase();
          return !!summary.ishistory || s !== 'WAPPR';
        }

        if (categoryKey === "Main d'œuvre réelle") {
          const s = String(summary.status ?? '').trim().toUpperCase();
          return !!summary.ishistory || !(s === 'WAPPR' || s === 'INPRG');
        }

        return false;
      },
      [summary, hasFailureReporting],
    );

    const handleCategoryPress = useCallback(
      async (categoryKey: string) => {
        if (!summary) return;

        if (categoryKey === 'Ordres de travail liés') {
          navigation.navigate('RelatedWorkOrdersList', {
            wonum: String(summary.wonum ?? ''),
            siteid: String(summary.siteid ?? ''),
            items: relatedWorkOrders,
          });
          return;
        }
        if (categoryKey === 'Activités') {
          const woHref = String(summary.href ?? '').trim();

          navigation.navigate('ActivityList', {
            woHref,
            wonum: summary.wonum,
            siteid: summary.siteid,
            items: summary.activities ?? [],
          });
          return;
        }

        if (categoryKey === 'Work log') {
          try {
            const wlPack = await getWorkLogsForWonum({
              wonum: String(summary.wonum || ''),
              username: String(username || ''),
              password: String(password || ''),
            });

            navigation.navigate('WorkLogList', {
              title: 'Work log',
              wonum: summary.wonum,
              items: wlPack.worklogs,
            });
          } catch (e) {
            console.log('[WORKLOG ERROR]', e);
            showError('Impossible de charger les work logs');
          }
          return;
        }

        if (categoryKey === "Main d'œuvre planifiée") {
          navigation.navigate('DetailsPlannedLabor', {
            workOrder: {
              wonum: summary.wonum,
              labor: summary.labor ?? [],
            },
          });
          return;
        }

        if (categoryKey === 'Matériel planifié') {
          try {
            const enriched = await enrichPlannedMaterialsWithBarcode({
              wonum: String(summary.wonum ?? ''),
              items: plannedItemsWithBarcode,
            });

            navigation.navigate('MaterialsList', {
              title: 'Matériels planifiés',
              wonum: String(wonum),
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
              wonum: summary.wonum,
              docLinks: summary.docLinks ?? [],
            },
          });
          return;
        }

        if (categoryKey === 'Matériel réel') {
          navigation.navigate('MaterialsList', {
            title: 'Matériel réel',
            wonum: summary.wonum,
            items: summary.actualMaterials ?? [],
            mode: 'actual',
          });
          return;
        }

        navigation.navigate('DetailsActualLabor', {
          woHref: String(summary.href ?? '').trim(),
          wonum: summary.wonum,
        });
      },
      [
    navigation,
    showError,
    summary,
    username,
    password,
    plannedItemsWithBarcode,
    wonum,
    relatedWorkOrders,
  ],
    );

    const handlePlusPress = useCallback(
      (categoryKey: string) => {
        if (!summary) return;

        if (categoryKey === 'Ordres de travail liés') {
          navigation.navigate('AddRelatedWorkOrder', {
            wonum: String(summary.wonum ?? ''),
            siteid: String(summary.siteid ?? ''),
            description: String(summary.description ?? ''),
            assetnum: String((summary as any).assetnum ?? summary.asset ?? ''),
            location: String(summary.location ?? ''),
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
            wonum: String(summary.wonum ?? ''),
            siteid: String(summary.siteid ?? ''),
            description: summary.description,
            assetnum: summary.asset,
            assetDescription: summary.assetDescription,
            location: summary.location,
            locationDescription: summary.locationDescription,
            status: summary.status,
          });
          return;
        }

        if (categoryKey === 'Ordres de travail liés') {
          navigation.navigate('AddRelatedWorkOrder', {
            wonum: String(summary.wonum ?? ''),
            siteid: String(summary.siteid ?? ''),
            description: String(summary.description ?? ''),
            assetnum: String((summary as any).assetnum ?? summary.asset ?? ''),
            location: String(summary.location ?? ''),
          });
          return;
        }

        if (categoryKey === 'Documents') {
          navigation.navigate('AddDoclink', {
            ownerid: Number(summary.workorderid ?? 0),
            siteid: String(summary.siteid ?? ''),
          });
          return;
        }

        if (categoryKey === 'Work log') {
          navigation.navigate('AddWorkLog', {
            wonum: summary.wonum,
            worklogCollectionRef: summary.worklog_collectionref,
            woHref: summary.href,
          });
          return;
        }

        if (categoryKey === 'Matériel planifié') {
          const allowed = canAddPlannedMaterial(summary.status, summary.ishistory);

          if (!allowed) {
            showError(
              getBlockedAddMessage(
                'plannedMaterial',
                summary.status,
                summary.ishistory,
              ),
              'Ajout non autorisé',
            );
            return;
          }

          navigation.navigate('AddPlannedMaterial', {
            wonum: summary.wonum,
            workorderid: summary.workorderid,
            siteid: summary.siteid,
            status: summary.status,
            ishistory: summary.ishistory,
          });
          return;
        }

        if (categoryKey === 'Matériel réel') {
          const allowed = canAddActualMaterial(summary.status, summary.ishistory);

          if (!allowed) {
            showError(
              getBlockedAddMessage(
                'actualMaterial',
                summary.status,
                summary.ishistory,
              ),
              'Ajout non autorisé',
            );
            return;
          }

          const woHref = String(summary.href ?? '').trim();

          if (!woHref || !summary.siteid) {
            showError('href OT ou siteid manquant');
            return;
          }

          navigation.navigate('AddActualMaterial', {
            wonum: summary.wonum,
            siteid: summary.siteid,
            woHref,
          });
          return;
        }

        if (categoryKey === "Main d'œuvre planifiée") {
          const s = String(summary.status ?? '').trim().toUpperCase();
          const allowed = !summary.ishistory && s === 'WAPPR';

          if (!allowed) {
            showError(
              `Ajout de main d'œuvre planifiée interdit pour le statut OT (${s || 'INCONNU'}).`,
              'Ajout non autorisé',
            );
            return;
          }

          navigation.navigate('AddPlannedLabor', {
            wonum: summary.wonum,
            workorderid: summary.workorderid,
            siteid: summary.siteid,
            status: summary.status,
            ishistory: summary.ishistory,
          });
          return;
        }

        if (categoryKey === "Main d'œuvre réelle") {
          const s = String(summary.status ?? '').trim().toUpperCase();
          const allowed = !summary.ishistory && (s === 'WAPPR' || s === 'INPRG');

          if (!allowed) {
            showError(
              `Ajout de main d'œuvre réelle interdit pour le statut OT (${s || 'INCONNU'}).`,
              'Ajout non autorisé',
            );
            return;
          }

          const woHref = String(summary.href ?? '').trim();

          if (!woHref || !summary.siteid) {
            showError('href OT ou siteid manquant');
            return;
          }

          navigation.navigate('AddActualLabor', {
            wonum: summary.wonum,
            siteid: summary.siteid,
            woHref,
          });
          return;
        }
      },
      [navigation, summary, hasFailureReporting, showError],
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

    if (loading) {
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

    if (error || !summary) {
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
                  wonum={summary.wonum}
                  description={summary.description || ''}
                  status={getFrenchStatusLabel(summary.status, summary.status || '')}
                  isUrgent={summary.isUrgent}
                  statusLocked={statusLocked}
                  asset={safeTrim(summary.asset || '')}
                  assetDescription={safeTrim(summary.assetDescription || '')}
                  location={safeTrim(summary.location || '')}
                  locationDescription={safeTrim(summary.locationDescription || '')}
                  scheduledStart={summary.scheduledStart || 'Non planifié'}
                  scheduledFinish={summary.scheduledFinish || 'Non planifié'}
                />
              </TouchableOpacity>
            </WorkOrderDetailsHeader>

            <View style={{ paddingHorizontal: layout.sidePadding, marginTop: 12 }}>
            </View>

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
          currentStatus={summary?.status || ''}
          href={summary?.href || ''}
          wonum={summary?.wonum || wonum}
          siteid={summary?.siteid || siteid}
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