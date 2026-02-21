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
import { RootStackParamList } from '../navigation/AppNavigator';
import { useWorkOrderDetails } from '../viewmodels/WorkOrderDetailsViewModel';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import StatusChangeModal from '../components/StatusChangeModal';

type Props = { route: RouteProp<RootStackParamList, 'WorkOrderDetails'> };
type NavProp = NativeStackNavigationProp<RootStackParamList, 'WorkOrderDetails'>;

const CATEGORIES = [
  { key: 'Activités', icon: 'list', gradient: ['#124aa5', '#0b4bd4'] },
  { key: 'Documents', icon: 'file-text', gradient: ['#124aa5', '#0b4bd4'] },

  { key: "Main d'œuvre planifiée", icon: 'users', gradient: ['#93c5fd', '#3b82f6'] },
  { key: "Main d'œuvre réelle", icon: 'user-check', gradient: ['#005ed1', '#0ea5e9'] },

  { key: 'Matériel planifié', icon: 'package', gradient: ['#93c5fd', '#3b82f6'] },
  { key: 'Matériel réel', icon: 'clipboard', gradient: ['#005ed1', '#0ea5e9'] },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function WorkOrderDetailsScreen({ route }: Props) {
  const woParam = (route as any)?.params?.workOrder;
  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensions();

  const layout = useMemo(() => {
    const sidePadding = clamp(Math.round(width * 0.05), 14, 24);
    const gap = clamp(Math.round(width * 0.04), 12, 18);

    const columns = 2;
    const contentWidth = width - sidePadding * 2;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cardHeight = clamp(cardWidth, 140, 220);

    return { sidePadding, gap, columns, cardWidth, cardHeight };
  }, [width]);

  const { username, password, authLoading } = useAuth();
  const { workOrder: details, loading, error, refresh } = useWorkOrderDetails(woParam?.wonum ?? '');

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(woParam?.status ?? '');
  const [currentStatusLabel, setCurrentStatusLabel] = useState(woParam?.status ?? '');

  useEffect(() => {
    if (details?.status) {
      setCurrentStatus(details.status);
      setCurrentStatusLabel(details.status);
    }
  }, [details?.status]);

  useEffect(() => {
    if (authLoading) return;
    if (!username || !password) {
      Alert.alert('Utilisateur non connecté', 'Veuillez vous connecter');
      navigation.replace('Login');
    }
  }, [authLoading, username, password, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && woParam?.wonum) refresh();
      return () => {};
    }, [authLoading, refresh, woParam?.wonum])
  );

  if (!woParam?.wonum) {
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
        <Text style={styles.loadingText}>{authLoading ? 'Vérification session...' : 'Chargement...'}</Text>
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

  const getCategoryCount = (category: string) => {
    switch (category) {
      case 'Activités':
        return details.activities?.length ?? 0;

      case "Main d'œuvre planifiée":
        return details.labor?.length ?? 0;

      case 'Matériel planifié':
        return details.materials?.length ?? 0;

      // ✅ from sm_mxwodetails
      case "Main d'œuvre réelle":
        return (details as any).actualLabor?.length ?? 0;

      case 'Matériel réel':
        return (details as any).actualMaterials?.length ?? 0;

      case 'Documents':
        return (details as any).docLinks?.length ?? 0;

      default:
        return 0;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1e40af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingHorizontal: layout.sidePadding, paddingTop: Platform.OS === 'android' ? 10 : 12 },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FeatherIcon name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détails OT</Text>
          <View style={styles.backButton} />
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

              <TouchableOpacity
                onPress={() => {
                  if (!(details as any)?.href) {
                    Alert.alert('Erreur', 'href manquant (impossible de changer le statut)');
                    return;
                  }
                  setStatusModalVisible(true);
                }}
                style={styles.statusChangeBtn}
                activeOpacity={0.8}
              >
                <FeatherIcon name="refresh-cw" size={13} color="#2563eb" />
                <Text style={styles.statusChangeBtnText}>{currentStatusLabel || currentStatus || '-'}</Text>
                <FeatherIcon name="chevron-down" size={13} color="#2563eb" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.description}>{details.description || 'Aucune description'}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <FeatherIcon name="tool" size={16} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Actif</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {(details as any).asset || '-'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <FeatherIcon name="map-pin" size={16} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Emplacement</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {(details as any).location || '-'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <FeatherIcon name="calendar" size={16} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Début prévu</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {details.scheduledStart ? String(details.scheduledStart) : '-'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <FeatherIcon name="check-square" size={16} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Fin prévue</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {(details as any).actualFinish ? String((details as any).actualFinish) : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingHorizontal: layout.sidePadding, paddingTop: 18 }}
        showsVerticalScrollIndicator={false}
      >
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
                    navigation.navigate('DetailsActualLabor', { workOrder: details });
                  } else if (category.key === 'Matériel planifié') {
                    navigation.navigate('DetailsMaterials', { workOrder: details });
                  } else if (category.key === 'Matériel réel') {
                    navigation.navigate('DetailsActualMaterials', { workOrder: details });
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

                  {category.key !== 'Activités' && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();

                        if (category.key === 'Matériel planifié') {
                          navigation.navigate('AddMaterial', {
                            wonum: details.wonum,
                            workorderid: details.workorderid,
                            siteid: details.siteid,
                            status: details.status,
                            ishistory: (details as any).ishistory,
                          });
                        } else if (category.key === "Main d'œuvre planifiée") {
                          if (!details.workorderid || !details.siteid) {
                            Alert.alert('Erreur', 'workorderid / siteid manquant');
                            return;
                          }
                          navigation.navigate('AddLabor', {
                            workorderid: details.workorderid,
                            siteid: details.siteid,
                          });
                        } else if (category.key === 'Matériel réel') {
                          if (!details.workorderid || !details.siteid) {
                            Alert.alert('Erreur', 'workorderid / siteid manquant');
                            return;
                          }
                          navigation.navigate('AddActualMaterial' as any, {
                            workorderid: details.workorderid,
                            siteid: details.siteid,
                          });
                        } else if (category.key === "Main d'œuvre réelle") {
                          if (!details.workorderid || !details.siteid) {
                            Alert.alert('Erreur', 'workorderid / siteid manquant');
                            return;
                          }
                          navigation.navigate('AddActualLabor' as any, {
                            workorderid: details.workorderid,
                            siteid: details.siteid,
                          });
                        } else if (category.key === 'Documents') {
                          if (!details.workorderid || !details.siteid) {
                            Alert.alert('Erreur', 'workorderid / siteid manquant');
                            return;
                          }
                          navigation.navigate('AddDoclink', {
                            ownerid: details.workorderid,
                            siteid: details.siteid,
                          });
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
      </ScrollView>

      <StatusChangeModal
        visible={statusModalVisible}
        entityType="WO"
        currentStatus={currentStatus}
        href={(details as any).href ?? ''}
        username={username || ''}
        password={password || ''}
        onClose={() => setStatusModalVisible(false)}
        onSuccess={async ({ code, label }) => {
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

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e3a8a' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#3b82f6', fontWeight: '600' },

  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f8fafc' },
  errorMessage: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 22 },

  retryButton: { borderRadius: 12, overflow: 'hidden' },
  retryButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  retryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  header: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  woCard: { backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 10, padding: 10, marginBottom: 8 },
  woHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  woLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  woNumber: { fontSize: 20, fontWeight: '800', color: '#3b82f6', marginTop: 2 },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'flex-end' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  statusChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusChangeBtnText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  description: { fontSize: 15, fontWeight: '500', color: '#0f172a', lineHeight: 22, marginBottom: 16 },

  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 },
  infoLabel: { fontSize: 12, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  content: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  categoryCard: { borderRadius: 20, overflow: 'hidden' },
  categoryGradient: { flex: 1, padding: 20, justifyContent: 'flex-start', position: 'relative' },

  plusButton: { position: 'absolute', bottom: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  categoryIconContainer: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12 },

  categoryCount: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, minWidth: 32, alignItems: 'center' },
  categoryCountText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});