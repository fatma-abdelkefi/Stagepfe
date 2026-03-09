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
import { useAuth } from '../context/AuthContext';
import StatusChangeModal from '../components/StatusChangeModal';
import { rewriteMaximoUrl } from '../services/rewriteMaximoUrl';

type Props = { route: RouteProp<RootStackParamList, 'WorkOrderDetails'> };

// ✅ IMPORTANT: navigation must be typed for the whole stack
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { key: 'Activités', icon: 'list', gradient: ['#124aa5', '#0b4bd4'] },
  { key: 'Documents', icon: 'file-text', gradient: ['#124aa5', '#0b4bd4'] },
  { key: "Main d'œuvre planifiée", icon: 'users', gradient: ['#93c5fd', '#3b82f6'] },
  { key: "Main d'œuvre réelle", icon: 'user-check', gradient: ['#005ed1', '#0ea5e9'] },
  { key: 'Matériel planifié', icon: 'package', gradient: ['#93c5fd', '#3b82f6'] },
  { key: 'Matériel réel', icon: 'clipboard', gradient: ['#005ed1', '#0ea5e9'] },
  { key: 'Work log', icon: 'clock', gradient: ['#124aa5', '#93c5fd'] },
];

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

export default function WorkOrderDetailsScreen({ route }: Props) {
  // Keep params stable
  const woParam = (route as any)?.params?.workOrder;
  const wonum = safeTrim(woParam?.wonum ?? '');

  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensions();

  const { username, password, authLoading } = useAuth();

  // ✅ Safe even when wonum === '' (because hook is fixed)
  const { workOrder: details, loading, error, refresh } = useWorkOrderDetails(wonum);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(woParam?.status ?? '');
  const [currentStatusLabel, setCurrentStatusLabel] = useState(
    safeTrim((woParam as any)?.status_description) || woParam?.status || ''
  );

  const layout = useMemo(() => {
    const sidePadding = clamp(Math.round(width * 0.05), 14, 24);
    const gap = clamp(Math.round(width * 0.04), 12, 18);
    const columns = 2;
    const contentWidth = width - sidePadding * 2;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cardHeight = clamp(cardWidth, 140, 220);
    return { sidePadding, gap, columns, cardWidth, cardHeight };
  }, [width]);

  const statusLocked = useMemo(() => isFinalStatus(details?.status), [details?.status]);
  const rawHref = useMemo(() => safeTrim((details as any)?.href ?? ''), [details]);
  const cleanWoHref = useMemo(() => normalizeHref(rawHref), [rawHref]);

  // Sync status label from API response
  useEffect(() => {
    if (details?.status) {
      const labelFromApi =
        safeTrim((details as any)?.status_description) ||
        safeTrim((details as any)?.statusDescription) ||
        '';
      setCurrentStatus(details.status);
      setCurrentStatusLabel(labelFromApi || details.status);
    }
  }, [details?.status, (details as any)?.status_description, (details as any)?.statusDescription]);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!username || !password) {
      Alert.alert('Utilisateur non connecté', 'Veuillez vous connecter');
      navigation.replace('Login');
    }
  }, [authLoading, username, password, navigation]);

  // Refresh on focus — safe guard inside callback
  useFocusEffect(
    useCallback(() => {
      if (authLoading || !wonum) return;
      refresh();
    }, [authLoading, wonum, refresh])
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
        default:
          return 0;
      }
    },
    [details]
  );

  const onPressStatus = useCallback(() => {
    if (statusLocked) return;
    if (!cleanWoHref) {
      Alert.alert('Erreur', 'href manquant / invalide');
      return;
    }
    setStatusModalVisible(true);
  }, [statusLocked, cleanWoHref]);

  // ── Early returns (all hooks above) ─────────────────────────────────────────

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

  // ── Main render ─────────────────────────────────────────────────────────────

  const assetCode = safeTrim((details as any).asset || '');
  const assetDesc = safeTrim((details as any).assetDescription || (details as any).asset_description || '');
  const locCode = safeTrim((details as any).location || '');
  const locDesc = safeTrim((details as any).locationDescription || (details as any).location_description || '');

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ Header NOT fixed anymore: it's inside the same ScrollView */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <LinearGradient
          colors={['#3b82f6', '#2563eb', '#1e40af']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.header,
            {
              paddingHorizontal: layout.sidePadding,
              paddingTop: Platform.OS === 'android' ? 6 : 8, // ✅ smaller
            },
          ]}
        >
          <View style={styles.headerTop}>
            {/* ✅ Changed icon + smaller button */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
              <FeatherIcon name="chevron-left" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Détails OT</Text>

            {/* ✅ Removed right square (no carré) – just invisible spacer */}
            <View style={styles.headerRightSpacer} />
          </View>

          <View style={styles.woCard}>
            <View style={styles.woHeader}>
              <View>
                <Text style={styles.woLabel}>Ordre de travail</Text>
                <Text style={styles.woNumber}>#{details.wonum}</Text>
              </View>

              <View style={styles.badgesRow}>
                {details.isUrgent && !details.completed && (
                  <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
                    <FeatherIcon name="alert-circle" size={14} color="#dc2626" />
                    <Text style={[styles.statusBadgeText, { color: '#dc2626' }]}>Urgent</Text>
                  </View>
                )}

                {details.completed && (
                  <View style={[styles.statusBadge, { backgroundColor: '#dbeafe' }]}>
                    <FeatherIcon name="check-circle" size={14} color="#2563eb" />
                    <Text style={[styles.statusBadgeText, { color: '#2563eb' }]}>Terminé</Text>
                  </View>
                )}

                {statusLocked ? (
                  <View style={styles.statusReadOnly}>
                    <FeatherIcon name="lock" size={13} color="#2563eb" />
                    <Text style={styles.statusReadOnlyText}>
                      {currentStatusLabel || currentStatus || '-'}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={onPressStatus} style={styles.statusChangeBtn} activeOpacity={0.8}>
                    <FeatherIcon name="refresh-cw" size={13} color="#2563eb" />
                    <Text style={styles.statusChangeBtnText}>
                      {currentStatusLabel || currentStatus || '-'}
                    </Text>
                    <FeatherIcon name="chevron-down" size={13} color="#2563eb" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={styles.description}>{details.description || 'Aucune description'}</Text>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <FeatherIcon name="tool" size={15} color="#3b82f6" />
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoValue}>
                    {assetCode ? assetCode : 'Non renseigné'}
                  </Text>
                  <Text style={styles.infoSubValue}>
                    {assetDesc ? assetDesc : 'Aucune description'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <FeatherIcon name="map-pin" size={15} color="#3b82f6" />
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoValue}>
                    {locCode ? locCode : 'Emplacement non renseigné'}
                  </Text>
                  <Text style={styles.infoSubValue}>
                    {locDesc ? locDesc : 'Aucune description'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <FeatherIcon name="calendar" size={15} color="#3b82f6" />
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Début prévu</Text>
                  <Text style={styles.infoValue}>
                    {details.scheduledStart ? String(details.scheduledStart) : 'Non planifié'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <FeatherIcon name="check-square" size={15} color="#3b82f6" />
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Fin prévue</Text>
                  <Text style={styles.infoValue}>
                    {(details as any).actualFinish ? String((details as any).actualFinish) : 'Non planifié'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ✅ Content continues below header, all scrolling together */}
        <View style={{ paddingHorizontal: layout.sidePadding, paddingTop: 18 }}>
          <Text style={styles.sectionTitle}>Catégories</Text>

          <View style={[styles.categoryGrid, { columnGap: layout.gap, rowGap: layout.gap }]}>
            {CATEGORIES.map((category) => {
              const count = getCategoryCount(category.key);

              return (
                <TouchableOpacity
                  key={category.key}
                  style={[styles.categoryCard, { width: layout.cardWidth, height: layout.cardHeight }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (category.key === 'Activités') {
                      navigation.navigate('DetailsActivities', { workOrder: details });
                    } else if (category.key === 'Documents') {
                      navigation.navigate('DetailsDocuments', { workOrder: details });
                    } else if (category.key === "Main d'œuvre planifiée") {
                      navigation.navigate('DetailsLabor', { workOrder: details });
                    } else if (category.key === "Main d'œuvre réelle") {
                      const hrefToSend = cleanWoHref || rawHref || String((details as any)?.href ?? '').trim();
                      navigation.navigate('DetailsActualLabor', {
                        workOrder: details,
                        woHref: hrefToSend,
                      });
                    } else if (category.key === 'Matériel planifié') {
                      navigation.navigate('DetailsMaterials', { workOrder: details });
                    } else if (category.key === 'Matériel réel') {
                      const hrefToSend = cleanWoHref || rawHref || String((details as any)?.href ?? '').trim();
                      navigation.navigate('DetailsActualMaterials', {
                        workOrder: details,
                        woHref: hrefToSend,
                      });
                    } else if (category.key === 'Work log') {
                      navigation.navigate('DetailsWorkLog', { workOrder: details });
                    }
                  }}
                >
                  <LinearGradient
                    colors={category.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryGradient}
                  >
                    <View>
                      <View style={styles.categoryIconContainer}>
                        <FeatherIcon name={category.icon as any} size={32} color="#fff" />
                      </View>
                      <Text style={styles.categoryName} numberOfLines={2}>
                        {category.key}
                      </Text>
                    </View>

                    <View style={styles.categoryCount}>
                      <Text style={styles.categoryCountText}>{count}</Text>
                    </View>

                    {(category.key === "Main d'œuvre réelle" ||
                      category.key === 'Matériel réel' ||
                      category.key === "Main d'œuvre planifiée" ||
                      category.key === 'Matériel planifié' ||
                      category.key === 'Documents' ||
                      category.key === 'Work log') && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();

                          if (category.key === 'Matériel réel') {
                            const hrefToSend = cleanWoHref || rawHref || String((details as any)?.href ?? '').trim();
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

                          if (category.key === "Main d'œuvre réelle") {
                            const hrefToSend = cleanWoHref || rawHref || String((details as any)?.href ?? '').trim();
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

                          if (category.key === 'Matériel planifié') {
                            navigation.navigate('AddMaterial', {
                              wonum: details.wonum,
                              workorderid: details.workorderid,
                              siteid: details.siteid,
                              status: details.status,
                              ishistory: (details as any).ishistory,
                            });
                            return;
                          }

                          if (category.key === "Main d'œuvre planifiée") {
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

                          if (category.key === 'Documents') {
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

                          if (category.key === 'Work log') {
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
                        }}
                        style={styles.plusButton}
                        activeOpacity={0.85}
                      >
                        <FeatherIcon name="plus" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
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
  loadingText: { marginTop: 16, fontSize: 16, color: '#3b82f6', fontWeight: '600' },

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
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: { borderRadius: 12, overflow: 'hidden' },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // ✅ smaller header
  header: {
    paddingBottom: 9, // smaller
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4, // smaller
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
    marginBottom: 6,
  },
  woHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  woLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  woNumber: { fontSize: 18, fontWeight: '800', color: '#3b82f6', marginTop: 2 },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  statusChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusChangeBtnText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  statusReadOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusReadOnlyText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },

  description: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 12,
  },

  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    minWidth: 0,
  },
  infoTextWrap: { flex: 1, minWidth: 0 },

  // ✅ smaller words here
  infoLabel: { fontSize: 11, color: '#64748b' },
  infoValue: {
    fontSize: 12, // smaller
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  infoSubValue: {
    marginTop: 1,
    fontSize: 10, // smaller
    fontWeight: '500',
    color: '#64748b',
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: 15,
  },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  categoryCard: { borderRadius: 30, overflow: 'hidden' },
  categoryGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  plusButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconContainer: {
    width: 30,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 12 },
  categoryCount: {
    position: 'absolute',
    top: 10,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  categoryCountText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});