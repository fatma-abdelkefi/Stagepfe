// src/views/WorkOrdersScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import BarcodeScanner from '../components/BarcodeScanner';
import CustomCalendar from '../components/CustomCalendar';
import { useWorkOrders, WorkOrder } from '../viewmodels/WorkOrdersViewModel';
import { getWorkOrders } from '../services/workOrdersService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkOrders'>;

export default function WorkOrdersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth();

  const {
    filteredData,
    activeFilter,
    setActiveFilter,
    search,
    setSearch,
    selectedDate,
    setSelectedDate,
    formatDate,
    todayCount,
    setBarcodeFilter,
    setData,
  } = useWorkOrders();

  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  console.log('📋 [WorkOrdersScreen] filteredData count:', filteredData.length);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');

      console.log('📋 [WorkOrdersScreen] fetchData — username:', username);

      if (!username || !password) {
        setError('Veuillez vous connecter (identifiants manquants).');
        Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
        await logout();
        return;
      }

      const wos = await getWorkOrders(username, password);
      setData(wos);
    } catch (err: any) {
      console.error(
        '📋 [WorkOrdersScreen] Error:',
        err?.response?.data || err?.message || err
      );
      const status = err?.response?.status;

      if (status === 401) {
        setError('Accès refusé (401). Vérifiez vos identifiants.');
        Alert.alert(
          'Erreur 401',
          'Identifiants invalides. Veuillez vous reconnecter.'
        );
        await logout();
        return;
      }

      setError('Erreur lors du chargement des ordres de travail');
    } finally {
      setLoading(false);
    }
  }, [logout, setData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    setBarcodeFilter(barcode);
    setActiveFilter('Tous');
    setSearch('');
    setSelectedDate(null);
  };

  const getStatusBadge = (status: string) => {
    const upper = (status || '').toUpperCase();

    switch (upper) {
      case 'COMP':
      case 'CLOSE':
        return { label: 'Terminé', color: '#10b981' };
      case 'WAPPR':
        return { label: 'En attente', color: '#ffbc04' };
      case 'APPR':
        return { label: 'Approuvé', color: '#64748b' };
      case 'CAN':
      case 'CANC':
        return { label: 'Annulé', color: '#ef4444' };
      default:
        return { label: 'En cours', color: '#3b82f6' };
    }
  };

  const renderItem = ({ item }: { item: WorkOrder }) => {
    const status = getStatusBadge(item.status);

    return (
      <TouchableOpacity
        onPress={() => {
          console.log('➡️ [WorkOrdersScreen] Navigate to details WO:', item.wonum);
          navigation.navigate('WorkOrderDetails', { workOrder: item });
        }}
        style={styles.card}
        activeOpacity={0.7}
      >
        <View style={[styles.statusStrip, { backgroundColor: status.color }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.wonumBadge}>
              <Text style={styles.wonumText}>{item.wonum}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusBadgeText}>{status.label}</Text>
            </View>
          </View>

          <Text style={styles.description}>{item.description}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoValue}>
                {item.asset?.trim() ? item.asset : 'Actif non renseigné'}
              </Text>
              <Text style={styles.infoDescription}>
                {item.assetDescription?.trim()
                  ? item.assetDescription
                  : 'Aucune description'}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoValue}>
                {item.location?.trim()
                  ? item.location
                  : 'Emplacement non renseigné'}
              </Text>
              <Text style={styles.infoDescription}>
                {item.locationDescription?.trim()
                  ? item.locationDescription
                  : 'Aucune description'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.scheduledDateText}>
              {item.scheduledStart
                ? formatDate(item.scheduledStart)
                : 'Non planifié'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#000000', '#1e3a8a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Chargement des ordres...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <FeatherIcon name="alert-circle" size={44} color="#ef4444" />
          </View>

          <Text style={styles.errorTitle}>Oups !</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryButtonGradient}
            >
              <FeatherIcon name="refresh-cw" size={16} color="#fff" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Ligne 1: notif + deconnexion a droite */}
        <View style={styles.headerTopRow}>
          <View style={styles.headerSpacer} />

          <View style={styles.headerIconsRight}>
            <TouchableOpacity style={styles.iconButton}>
              <FeatherIcon name="bell" size={18} color="#fff" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowLogoutConfirm(true)}
            >
              <FeatherIcon name="log-out" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ligne 2: nombre + calendrier sur toute la ligne */}
        <TouchableOpacity
          onPress={() => setOpenDatePicker(true)}
          style={styles.tasksFullRow}
          activeOpacity={0.8}
        >
          <View style={styles.tasksTextBlock}>
            <Text style={styles.tasksCount}>{todayCount}</Text>
            <Text style={styles.tasksSubLabel}>
              {selectedDate
                ? formatDate(selectedDate.toISOString())
                : 'Tâches du jour'}
            </Text>
          </View>

          <View style={styles.calendarButton}>
            <FeatherIcon name="calendar" size={16} color="#3b82f6" />
          </View>
        </TouchableOpacity>

        <View style={styles.headerFilters}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollHeader}
          >
            {[
              { key: 'Tous', icon: 'grid' },
              { key: "Aujourd'hui", icon: 'calendar' },
              { key: 'À venir', icon: 'clock' },
              { key: 'Urgent', icon: 'alert-circle' },
              { key: 'Terminés', icon: 'check-circle' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => {
                  setActiveFilter(filter.key);
                  setSearch('');
                  if (filter.key !== "Aujourd'hui") setSelectedDate(null);
                  setBarcodeFilter(null);
                }}
                style={[
                  styles.filterChip,
                  activeFilter === filter.key && styles.filterChipActive,
                ]}
              >
                <FeatherIcon
                  name={filter.icon as any}
                  size={14}
                  color={activeFilter === filter.key ? '#fff' : '#e2e8f0'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.key}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      <View style={styles.actionBar}>
        <View style={styles.searchContainer}>
          <FeatherIcon name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Rechercher un ordre..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#cbd5e1"
          />
        </View>

        <TouchableOpacity
          onPress={() => setShowScanner(true)}
          style={styles.actionButton}
        >
          <MaterialIcon name="qrcode-scan" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <CustomCalendar
        visible={openDatePicker}
        selectedDate={selectedDate}
        onConfirm={(date) => {
          setOpenDatePicker(false);
          setSelectedDate(date);
          setActiveFilter('Tous');
        }}
        onCancel={() => setOpenDatePicker(false)}
      />

      <Modal visible={showScanner} animationType="slide">
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      </Modal>

      <View style={styles.content}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FeatherIcon name="inbox" size={42} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>Aucun ordre trouvé</Text>
            <Text style={styles.emptySubtitle}>
              Essayez de modifier vos filtres
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.wonum}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirmer la déconnexion</Text>
            <Text style={styles.modalMessage}>
              Êtes-vous sûr de vouloir vous déconnecter ?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#3b82f6' }]}
                onPress={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
              >
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  headerSpacer: {
    flex: 1,
  },

  headerIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  iconButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
  },

  tasksFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },

  tasksTextBlock: {
    flexShrink: 1,
  },

  tasksCount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 22,
  },

  tasksSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 2,
  },

  calendarButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  headerFilters: {
    marginTop: 0,
  },

  filterScrollHeader: {
    paddingHorizontal: 0,
    gap: 6,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginRight: 6,
  },

  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e2e8f0',
  },

  filterChipTextActive: {
    color: '#fff',
  },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },

  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },

  actionButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  statusStrip: {
    width: 4,
  },

  cardContent: {
    flex: 1,
    padding: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },

  wonumBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  wonumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },

  description: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 18,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },

  infoBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  infoValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },

  infoDescription: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 13,
  },

  cardFooter: {
    width: '100%',
    alignItems: 'flex-end',
  },

  scheduledDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'right',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#93c5fd',
    fontWeight: '600',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },

  errorIcon: {
    width: 72,
    height: 72,
    backgroundColor: '#fee2e2',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },

  errorMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },

  retryButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    backgroundColor: '#f1f5f9',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    color: '#0f172a',
  },

  modalMessage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 22,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },

  modalCancelText: {
    fontWeight: '600',
    color: '#1e293b',
  },

  modalConfirmText: {
    fontWeight: '600',
    color: '#fff',
  },
});