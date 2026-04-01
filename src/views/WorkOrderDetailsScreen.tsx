// src/screens/WorkOrderDetailsScreen.tsx
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useWorkOrderDetails } from '../viewmodels/WorkOrderDetailsViewModel';
import { useWorkOrderFailureReport } from '../viewmodels/useWorkOrderFailureReport';
import { useAuth } from '../context/AuthContext';
import StatusChangeModal from '../components/StatusChangeModal';
import { rewriteMaximoUrl } from '../services/rewriteMaximoUrl';
import { getFrenchStatusLabel } from '../services/statusService';

type Props = { route: RouteProp<RootStackParamList, 'WorkOrderDetails'> };
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORY_SECTIONS = [
  {
    title: 'Planification',
    items: [
      { key: 'Activités', icon: 'list', gradient: ['#124aa5', '#0b4bd4'] },
      { key: "Main d'œuvre planifiée", icon: 'users', gradient: ['#93c5fd', '#3b82f6'] },
      { key: 'Matériel planifié', icon: 'package', gradient: ['#93c5fd', '#3b82f6'] },
    ],
  },
  {
    title: 'Attachements',
    items: [{ key: 'Documents', icon: 'file-text', gradient: ['#124aa5', '#0b4bd4'] }],
  },
  {
    title: 'Réelle',
    items: [
      { key: "Main d'œuvre réelle", icon: 'user-check', gradient: ['#005ed1', '#0ea5e9'] },
      { key: 'Matériel réel', icon: 'clipboard', gradient: ['#005ed1', '#0ea5e9'] },
      { key: 'Work log', icon: 'clock', gradient: ['#124aa5', '#93c5fd'] },
    ],
  },
  {
    title: 'Signalement de défaillances',
    items: [
      { key: "Détails de l'échec", icon: 'alert-triangle', gradient: ['#242b97', '#409ff7'] },
    ],
  },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function upper(s?: string) {
  return safeTrim(s).toUpperCase();
}

function isFinalStatus(status?: string) {
  const s = upper(status);
  return s === 'COMP' || s === 'CLOSE' || s === 'CAN' || s === 'CANC';
}

function normalizeHref(href: any): string {
  let u = safeTrim(href);
  if (!u) return '';
  u = u.replace('/maxiimo/', '/maximo/');
  u = u.replace('/maximo/maximo/', '/maximo/');
  u = rewriteMaximoUrl(u);
  u = u.replace(/\/+$/, '');
  return u;
}

function getDisplayStatusLabel(status?: string, fallbackLabel?: string) {
  return getFrenchStatusLabel(status, fallbackLabel);
}

export default function WorkOrderDetailsScreen({ route }: Props) {
  const woParam = route.params?.workOrder;
  const wonum = safeTrim(woParam?.wonum ?? '');

  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensions();

  const { username, password, authLoading } = useAuth();
  const { workOrder: details, loading, error, refresh } = useWorkOrderDetails(wonum);

  const siteidForFailure = safeTrim((details as any)?.siteid || woParam?.siteid || '');
  const {
  data: currentFailureReport,
  loading: loadingFailureReport,
  refresh: refreshFailureReport,
} = useWorkOrderFailureReport(wonum, siteidForFailure);

  const hasFailureReport = useMemo(() => {
    if (!currentFailureReport) return false;

    return !!(
      safeTrim(currentFailureReport.failureClass) ||
      safeTrim((currentFailureReport as any).problem) ||
      safeTrim((currentFailureReport as any).cause) ||
      safeTrim((currentFailureReport as any).remedy) ||
      (Array.isArray(currentFailureReport.codes) && currentFailureReport.codes.length > 0)
    );
  }, [currentFailureReport]);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(woParam?.status ?? '');
  const [currentStatusLabel, setCurrentStatusLabel] = useState(
    safeTrim((woParam as any)?.status_description) || woParam?.status || '',
  );

  const layout = useMemo(() => {
    const sidePadding = clamp(Math.round(width * 0.05), 14, 24);
    const gap = clamp(Math.round(width * 0.03), 8, 12);
    const columns = 2;
    const contentWidth = width - sidePadding * 2;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cardHeight = clamp(cardWidth * 0.8, 112, 150);
    return { sidePadding, gap, columns, cardWidth, cardHeight };
  }, [width]);

  const statusLocked = useMemo(() => isFinalStatus(details?.status), [details?.status]);
  const rawHref = useMemo(() => safeTrim((details as any)?.href ?? ''), [details]);
  const cleanWoHref = useMemo(() => normalizeHref(rawHref), [rawHref]);

  useEffect(() => {
    if (details?.status) {
      const labelFromApi =
        safeTrim((details as any)?.status_description) ||
        safeTrim((details as any)?.statusDescription) ||
        '';

      setCurrentStatus(details.status);
      setCurrentStatusLabel(getFrenchStatusLabel(details.status, labelFromApi));
    }
  }, [details]);

  useEffect(() => {
    if (authLoading) return;
    if (!username || !password) {
      Alert.alert('Utilisateur non connecté', 'Veuillez vous connecter');
      navigation.replace('Login');
    }
  }, [authLoading, username, password, navigation]);

  useFocusEffect(
  useCallback(() => {
    if (authLoading || !wonum) return;

    refresh();
    refreshFailureReport();
  }, [authLoading, wonum, refresh, refreshFailureReport]),
);

  const getCategoryCount = useCallback(
    (category: string) => {
      if (!details) return 0;

      switch (category) {
        case 'Activités':
          return details.activities?.length ?? 0;
        case "Main d'œuvre planifiée":
          return details.labor?.length ?? 0;
        case 'Matériel planifié':
          return details.materials?.length ?? 0;
        case "Main d'œuvre réelle":
          return (details as any).actualLabor?.length ?? 0;
        case 'Matériel réel':
          return (details as any).actualMaterials?.length ?? 0;
        case 'Documents':
          return (details as any).docLinks?.length ?? 0;
        case 'Work log':
          return (details as any).workLogs?.length ?? (details as any).worklog?.length ?? 0;
        case "Détails de l'échec":
          if (loadingFailureReport) return 0;
          return hasFailureReport ? 1 : 0;
        default:
          return 0;
      }
    },
    [details, hasFailureReport, loadingFailureReport],
  );

  const onPressStatus = useCallback(() => {
    if (statusLocked) return;
    if (!cleanWoHref) {
      Alert.alert('Erreur', 'href manquant / invalide');
      return;
    }
    setStatusModalVisible(true);
  }, [statusLocked, cleanWoHref]);

  const handleCategoryPress = useCallback(
  (categoryKey: string) => {
    if (!details) return;

    if (categoryKey === 'Activités') {
      navigation.navigate('DetailsActivities', { workOrder: details });
      return;
    }

    if (categoryKey === 'Documents') {
      navigation.navigate('DetailsDocuments', { workOrder: details });
      return;
    }

    if (categoryKey === "Main d'œuvre planifiée") {
      navigation.navigate('DetailsLabor', { workOrder: details });
      return;
    }

    if (categoryKey === "Main d'œuvre réelle") {
      const hrefToSend =
        cleanWoHref || rawHref || String((details as any)?.href ?? '').trim();

      navigation.navigate('DetailsActualLabor', {
        workOrder: details,
        woHref: hrefToSend,
      });
      return;
    }

    if (categoryKey === 'Matériel planifié') {
      navigation.navigate('DetailsMaterials', { workOrder: details });
      return;
    }

    if (categoryKey === 'Matériel réel') {
      const hrefToSend =
        cleanWoHref || rawHref || String((details as any)?.href ?? '').trim();

      navigation.navigate('DetailsActualMaterials', {
        workOrder: details,
        woHref: hrefToSend,
      });
      return;
    }

    if (categoryKey === 'Work log') {
      navigation.navigate('DetailsWorkLog', { workOrder: details });
      return;
    }

    if (categoryKey === "Détails de l'échec") {
      if (hasFailureReport) {
        navigation.navigate('FailureReportingDetails', {
          workOrder: details,
        });
      } else {
        navigation.navigate('FailureReporting', {
          workOrder: details,
        });
      }
    }
  },
  [details, navigation, cleanWoHref, rawHref, hasFailureReport],
);

  const handlePlusPress = useCallback(
    (categoryKey: string) => {
      if (!details) return;

      if (categoryKey === 'Matériel réel') {
        const hrefToSend =
          cleanWoHref || rawHref || String((details as any)?.href ?? '').trim();

        if (!hrefToSend) {
          Alert.alert('Erreur', 'href OT manquant');
          return;
        }

        navigation.navigate('AddActualMaterial' as any, {
          wonum: details.wonum,
          siteid: details.siteid,
          woHref: hrefToSend,
        });
        return;
      }

      if (categoryKey === "Main d'œuvre réelle") {
        const hrefToSend =
          cleanWoHref || rawHref || String((details as any)?.href ?? '').trim();

        if (!hrefToSend) {
          Alert.alert('Erreur', 'href OT manquant');
          return;
        }

        navigation.navigate('AddActualLabor' as any, {
          wonum: details.wonum,
          siteid: details.siteid,
          woHref: hrefToSend,
        });
        return;
      }

      if (categoryKey === 'Matériel planifié') {
        navigation.navigate('AddMaterial', {
          wonum: details.wonum,
          workorderid: details.workorderid,
          siteid: details.siteid,
          status: details.status,
          ishistory: (details as any).ishistory,
        });
        return;
      }

      if (categoryKey === "Main d'œuvre planifiée") {
        if (!details.workorderid || !details.siteid) {
          Alert.alert('Erreur', 'workorderid / siteid manquant');
          return;
        }

        navigation.navigate('AddLabor', {
          workorderid: details.workorderid,
          siteid: details.siteid,
        });
        return;
      }

      if (categoryKey === 'Documents') {
        if (!details.workorderid || !details.siteid) {
          Alert.alert('Erreur', 'workorderid / siteid manquant');
          return;
        }

        navigation.navigate('AddDoclink', {
          ownerid: details.workorderid,
          siteid: details.siteid,
        });
        return;
      }

      if (categoryKey === 'Work log') {
        const ref = safeTrim((details as any).worklog_collectionref || '');
        if (!ref) {
          Alert.alert('Erreur', 'worklog_collectionref manquant');
          return;
        }

        navigation.navigate('AddWorkLog', {
          worklogCollectionRef: ref,
          wonum: details.wonum,
        });
        return;
      }

      if (categoryKey === "Détails de l'échec") {
        navigation.navigate('FailureReporting', {
          workOrder: details,
        });
      }
    },
    [details, navigation, cleanWoHref, rawHref],
  );

  if (!wonum) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <FeatherIcon name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorMessage}>Paramètres manquants (workOrder / wonum).</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryButton}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <FeatherIcon name="arrow-left" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Retour</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>
          {authLoading ? 'Vérification session...' : 'Chargement...'}
        </Text>
      </View>
    );
  }

  if (error || !details) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <FeatherIcon name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorMessage}>{error || 'Aucune donnée disponible'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryButton}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <FeatherIcon name="arrow-left" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Retour</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const assetCode = safeTrim((details as any).asset || '');
  const assetDesc = safeTrim(
    (details as any).assetDescription || (details as any).asset_description || '',
  );
  const locCode = safeTrim((details as any).location || '');
  const locDesc = safeTrim(
    (details as any).locationDescription || (details as any).location_description || '',
  );
  const statusDisplayLabel = getDisplayStatusLabel(currentStatus, currentStatusLabel);
  const startDate = details.scheduledStart ? String(details.scheduledStart) : 'Non planifié';
  const finishDate = (details as any).actualFinish
    ? String((details as any).actualFinish)
    : 'Non planifié';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
        <LinearGradient
          colors={['#3b82f6', '#2563eb', '#1e40af']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.header,
            {
              paddingHorizontal: layout.sidePadding,
              paddingTop: Platform.OS === 'android' ? 6 : 8,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <FeatherIcon name="chevron-left" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Détails OT</Text>

            <View style={styles.headerRightSpacer} />
          </View>

          <View style={styles.woCard}>
            <View style={styles.woHeader}>
              <View>
                <Text style={styles.woLabel}>Ordre de travail</Text>
                <Text style={styles.woNumber}>#{details.wonum}</Text>
              </View>

              <View style={styles.badgesRow}>
                {details.isUrgent && !statusLocked && (
                  <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
                    <FeatherIcon name="alert-circle" size={13} color="#dc2626" />
                    <Text style={[styles.statusBadgeText, { color: '#dc2626' }]}>Urgent</Text>
                  </View>
                )}

                {statusLocked ? (
                  <View style={styles.statusReadOnly}>
                    <FeatherIcon name="lock" size={12} color="#2563eb" />
                    <Text style={styles.statusReadOnlyText}>{statusDisplayLabel}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={onPressStatus}
                    style={styles.statusChangeBtn}
                    activeOpacity={0.8}
                  >
                    <FeatherIcon name="refresh-cw" size={12} color="#2563eb" />
                    <Text style={styles.statusChangeBtnText}>{statusDisplayLabel}</Text>
                    <FeatherIcon name="chevron-down" size={12} color="#2563eb" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={styles.description}>{details.description || 'Aucune description'}</Text>

            <View style={styles.infoLine}>
              <FeatherIcon name="tool" size={14} color="#3b82f6" />
              <View style={styles.infoLineText}>
                <Text style={styles.infoValue}>{assetCode ? assetCode : 'Non renseigné'}</Text>
                <Text style={styles.infoSubValue}>
                  {assetDesc ? assetDesc : 'Aucune description'}
                </Text>
              </View>
            </View>

            <View style={styles.infoLine}>
              <FeatherIcon name="map-pin" size={14} color="#3b82f6" />
              <View style={styles.infoLineText}>
                <Text style={styles.infoValue}>
                  {locCode ? locCode : 'Emplacement non renseigné'}
                </Text>
                <Text style={styles.infoSubValue}>{locDesc ? locDesc : 'Aucune description'}</Text>
              </View>
            </View>

            <View style={styles.datesRow}>
              <View style={styles.dateItem}>
                <FeatherIcon name="calendar" size={13} color="#3b82f6" />
                <View style={styles.dateTextWrap}>
                  <Text style={styles.dateLabel}>Début prévu</Text>
                  <Text style={styles.dateValue}>{startDate}</Text>
                </View>
              </View>

              <View style={styles.dateItem}>
                <FeatherIcon name="check-square" size={13} color="#3b82f6" />
                <View style={styles.dateTextWrap}>
                  <Text style={styles.dateLabel}>Fin prévue</Text>
                  <Text style={styles.dateValue}>{finishDate}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: layout.sidePadding, paddingTop: 10 }}>
          {CATEGORY_SECTIONS.map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{section.title}</Text>

              <View style={[styles.categoryGrid, { columnGap: layout.gap, rowGap: layout.gap }]}>
                {section.items.map((category) => {
                  const count = getCategoryCount(category.key);
                  const showPlus =
                    category.key === "Main d'œuvre réelle" ||
                    category.key === 'Matériel réel' ||
                    category.key === "Main d'œuvre planifiée" ||
                    category.key === 'Matériel planifié' ||
                    category.key === 'Documents' ||
                    category.key === 'Work log' ||
                    (category.key === "Détails de l'échec" && !hasFailureReport);

                  return (
                    <View
                      key={category.key}
                      style={[
                        styles.categoryCardWrap,
                        { width: layout.cardWidth, height: layout.cardHeight },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.categoryCardTouch}
                        activeOpacity={0.8}
                        onPress={() => handleCategoryPress(category.key)}
                      >
                        <LinearGradient
                          colors={category.gradient as any}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.categoryGradient}
                        >
                          <View>
                            <View style={styles.categoryIconContainer}>
                              <FeatherIcon name={category.icon as any} size={24} color="#fff" />
                            </View>

                            <Text style={styles.categoryName} numberOfLines={2}>
                              {category.key}
                            </Text>
                          </View>

                          <View style={styles.categoryCount}>
                            <Text style={styles.categoryCountText}>{count}</Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>

                      {showPlus && (
                        <TouchableOpacity
                          onPress={() => handlePlusPress(category.key)}
                          style={styles.plusButton}
                          activeOpacity={0.9}
                        >
                          <FeatherIcon name="plus" size={18} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <StatusChangeModal
        visible={statusModalVisible}
        entityType="WO"
        currentStatus={currentStatus}
        locked={statusLocked}
        wonum={details.wonum}
        siteid={details.siteid}
        href={cleanWoHref}
        username={username || ''}
        password={password || ''}
        onClose={() => setStatusModalVisible(false)}
        onSuccess={({ code, label }) => {
          setCurrentStatus(code);
          setCurrentStatusLabel(label || code);
          setTimeout(() => refresh(), 300);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
  },
  loadingText: { marginTop: 10, fontSize: 15, color: '#dbeafe', fontWeight: '600' },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  errorMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: { borderRadius: 10, overflow: 'hidden' },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  header: {
    paddingBottom: 8,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightSpacer: {
    width: 32,
    height: 32,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },

  woCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 2,
  },
  woHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  woLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  woNumber: { fontSize: 18, fontWeight: '800', color: '#3b82f6', marginTop: 1 },

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
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  statusChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1.3,
    borderColor: '#3b82f6',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
  },
  statusChangeBtnText: { fontSize: 11, fontWeight: '700', color: '#2563eb' },

  statusReadOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.3,
    borderColor: 'rgba(59,130,246,0.6)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
  },
  statusReadOnlyText: { fontSize: 11, fontWeight: '800', color: '#2563eb' },

  description: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
    lineHeight: 18,
    marginBottom: 6,
  },

  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  infoLineText: {
    flex: 1,
    minWidth: 0,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
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
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
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
    color: '#0f172a',
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 1,
  },

  sectionBlock: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryCardWrap: {
    borderRadius: 20,
    overflow: 'visible',
    position: 'relative',
  },
  categoryCardTouch: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
    position: 'relative',
  },
  plusButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 6,
  },
  categoryIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
    paddingRight: 24,
  },
  categoryCount: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
});