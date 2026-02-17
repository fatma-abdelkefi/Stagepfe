import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useWorkOrderDetails } from '../viewmodels/WorkOrderDetailsViewModel';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

type Props = {
  route: RouteProp<RootStackParamList, 'WorkOrderDetails'>;
};

type WorkOrderDetailsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WorkOrderDetails'
>;

const CATEGORIES = [
  { key: 'Activités', icon: 'list', gradient: ['#3b82f6', '#2563eb'] },
  { key: "Main d'œuvre", icon: 'users', gradient: ['#60a5fa', '#3b82f6'] },
  { key: 'Matériel', icon: 'package', gradient: ['#93c5fd', '#60a5fa'] },
  { key: 'Documents', icon: 'file-text', gradient: ['#1e40af', '#1e3a8a'] },
];

export default function WorkOrderDetailsScreen({ route }: Props) {
  const { workOrder: woParam } = route.params;
  const navigation = useNavigation<WorkOrderDetailsNavigationProp>();

  // ✅ Hook 1 (always)
  const { username, password, authLoading } = useAuth();

  // ✅ Hook 2.. (always)
  const { workOrder: details, loading, error, refresh } = useWorkOrderDetails(woParam.wonum);

  // ✅ Hook (always)
  useEffect(() => {
    if (authLoading) return;

    if (!username || !password) {
      Alert.alert('Utilisateur non connecté', 'Veuillez vous connecter');
      navigation.replace('Login');
    }
  }, [authLoading, username, password, navigation]);

  // ✅ Hook (always)
  useFocusEffect(
    useCallback(() => {
      // Don’t call refresh while auth is still loading
      if (!authLoading) {
        refresh();
      }
      return () => {};
    }, [authLoading, refresh])
  );

  const getCategoryCount = (category: string) => {
    if (!details) return 0;
    switch (category) {
      case 'Activités':
        return details.activities?.length ?? 0;
      case "Main d'œuvre":
        return details.labor?.length ?? 0;
      case 'Matériel':
        return details.materials?.length ?? 0;
      case 'Documents':
        return details.docLinks?.length ?? 0;
      default:
        return 0;
    }
  };

  // ✅ ONLY AFTER all hooks are called, you may return conditionally
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
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1e40af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
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
          </View>

          <Text style={styles.description}>{details.description || 'Aucune description'}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <FeatherIcon name="tool" size={16} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Actif</Text>
                <Text style={styles.infoValue}>{details.asset || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <FeatherIcon name="map-pin" size={16} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Emplacement</Text>
                <Text style={styles.infoValue}>{details.location || '-'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <FeatherIcon name="calendar" size={16} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Début prévu</Text>
                <Text style={styles.infoValue}>{details.scheduledStart || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <FeatherIcon name="check-square" size={16} color="#3b82f6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Fin prévue</Text>
                <Text style={styles.infoValue}>{details.actualFinish || '-'}</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Catégories</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(category => {
            const count = getCategoryCount(category.key);

            return (
              <TouchableOpacity
                key={category.key}
                style={styles.categoryCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (category.key === 'Activités') {
                    navigation.navigate('DetailsActivities', { workOrder: details });
                  } else if (category.key === "Main d'œuvre") {
                    navigation.navigate('DetailsLabor', { workOrder: details });
                  } else if (category.key === 'Matériel') {
                    navigation.navigate('DetailsMaterials', { workOrder: details });
                  } else if (category.key === 'Documents') {
                    navigation.navigate('DetailsDocuments', { workOrder: details });
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
                    <Text style={styles.categoryName}>{category.key}</Text>
                  </View>

                  <View style={styles.categoryCount}>
                    <Text style={styles.categoryCountText}>{count}</Text>
                  </View>

                  {category.key !== 'Activités' && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        if (category.key === 'Matériel') {
                          navigation.navigate('AddMaterial', {
                            wonum: details.wonum,
                            workorderid: details.workorderid,
                            siteid: details.siteid,
                            status: details.status,
                            ishistory: details.ishistory,
                          });
                        } else if (category.key === "Main d'œuvre") {
                          if (!details.workorderid || !details.siteid) {
                            Alert.alert('Erreur', 'workorderid / siteid manquant pour cet OT');
                            return;
                          }
                          navigation.navigate('AddLabor', {
                            workorderid: details.workorderid,
                            siteid: details.siteid,
                          });
                        } else if (category.key === 'Documents') {
                          if (!details.workorderid || !details.siteid) {
                            Alert.alert('Erreur', 'workorderid / siteid manquant pour cet OT');
                            return;
                          }
                          navigation.navigate('AddDoclink', {
                            ownerid: details.workorderid,
                            siteid: details.siteid,
                          });
                        }
                      }}
                      style={styles.plusButton}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e3a8a' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#3b82f6', fontWeight: '600' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f8fafc' },
  errorMessage: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 22 },
  retryButton: { borderRadius: 12, overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  retryButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  retryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  header: { paddingHorizontal: 15, paddingTop: 11, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  woCard: { backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 10, padding: 10, marginBottom: 8 },
  woHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  woLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  woNumber: { fontSize: 20, fontWeight: '800', color: '#3b82f6', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 15, fontWeight: '500', color: '#0f172a', lineHeight: 22, marginBottom: 16 },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 },
  infoLabel: { fontSize: 12, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  categoryCard: { width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 20, overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  categoryGradient: { flex: 1, padding: 20, justifyContent: 'flex-start', position: 'relative' },
  plusButton: { position: 'absolute', bottom: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  categoryIconContainer: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12 },
  categoryCount: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255, 255, 255, 0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, minWidth: 32, alignItems: 'center' },
  categoryCountText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});