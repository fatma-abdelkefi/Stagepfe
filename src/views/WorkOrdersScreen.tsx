// src/views/WorkOrdersScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
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
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import BarcodeScanner from '../components/BarcodeScanner';
import CustomCalendar from '../components/CustomCalendar';
import { useWorkOrders, WorkOrder } from '../viewmodels/WorkOrdersViewModel';
import { getWorkOrders } from '../services/workOrdersService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkOrders'>;

export default function WorkOrdersScreen() {
  const navigation = useNavigation<NavigationProp>();

  const {
    filteredData,
    activeFilter,
    setActiveFilter,
    search,
    setSearch,
    selectedDate,
    setSelectedDate,
    toggleComplete,
    formatDate,
    todayCount,
    barcodeFilter,
    setBarcodeFilter,
    setData,
  } = useWorkOrders();

  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');

      if (!username || !password) {
        setError('Veuillez vous connecter (identifiants manquants).');
        Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
        navigation.replace('Login' as any);
        return;
      }

      const wos = await getWorkOrders(username, password);
      setData(wos);
    } catch (err: any) {
      console.error(
        'Error fetching work orders:',
        err?.response?.data || err?.message || err
      );

      const status = err?.response?.status;
      if (status === 401) {
        setError('Accès refusé (401). Vérifiez vos identifiants.');
        Alert.alert('Erreur 401', 'Identifiants invalides. Veuillez vous reconnecter.');
        navigation.replace('Login' as any);
        return;
      }

      setError('Erreur lors du chargement des ordres de travail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [setData]);

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
          console.log('➡️ Navigate details with WO:', item);
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

            <View style={styles.statusBadges}>
              <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                <Text style={styles.statusBadgeText}>{status.label}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Top Row: Asset & Location */}
          <View style={styles.infoRow}>
            {/* Asset */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Actif</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.asset || '—'}
              </Text>
              <Text style={styles.infoDescription} numberOfLines={1}>
                {item.assetDescription || 'Aucune description'}
              </Text>
            </View>

            {/* Location */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Emplacement</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.location || '—'}
              </Text>
              <Text style={styles.infoDescription} numberOfLines={1}>
                {item.locationDescription || 'Aucune description'}
              </Text>
            </View>
          </View>

          {/* Bottom Row: Scheduled Start */}
          <View style={styles.infoRow}>
            <View style={styles.infoBoxFull}>
              <Text style={styles.infoLabel}>Début planifié</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.scheduledStart ? formatDate(item.scheduledStart) : 'Non planifié'}
              </Text>
            </View>
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
            <FeatherIcon name="alert-circle" size={48} color="#ef4444" />
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
              <FeatherIcon name="refresh-cw" size={18} color="#fff" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Gradient */}
      <LinearGradient
        colors={['#000000', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>S</Text>
            </LinearGradient>
            <View>
              <Text style={styles.greeting}>Bonjour</Text>
              <Text style={styles.userName}>Smartech Team</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <FeatherIcon name="bell" size={22} color="#fff" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setOpenDatePicker(true)} activeOpacity={0.8}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryCount}>{todayCount}</Text>
              <Text style={styles.summaryLabel}>
                {selectedDate ? formatDate(selectedDate.toISOString()) : 'Tâches du jour'}
              </Text>
            </View>
            <View style={styles.summaryRight}>
              <FeatherIcon name="calendar" size={18} color="#3b82f6" />
              <Text style={styles.summaryDate}>
                {selectedDate
                  ? selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
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
                size={16}
                color={activeFilter === filter.key ? '#fff' : '#64748b'}
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

      {/* Search + Scanner */}
      <View style={styles.actionBar}>
        <View style={styles.searchContainer}>
          <FeatherIcon name="search" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Rechercher un ordre..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#cbd5e1"
          />
        </View>

        <TouchableOpacity onPress={() => setShowScanner(true)} style={styles.actionButton}>
          <MaterialIcon name="qrcode-scan" size={22} color="#3b82f6" />
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
              <FeatherIcon name="inbox" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>Aucun ordre trouvé</Text>
            <Text style={styles.emptySubtitle}>Essayez de modifier vos filtres</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 18, 
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24 
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 14 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoGradient: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  logoText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  greeting: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  userName: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  notificationButton: { 
    width: 44, 
    height: 44, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative' 
  },
  notificationDot: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#ef4444', 
    borderWidth: 2, 
    borderColor: '#1e3a8a' 
  },
  summaryCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
    borderRadius: 16, 
    padding: 16, 
    shadowColor: '#3b82f6', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 12, 
    elevation: 5, 
    borderWidth: 1, 
    borderColor: 'rgba(59, 130, 246, 0.1)' 
  },
  summaryLeft: { flex: 1 },
  summaryCount: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  summaryLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  summaryRight: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10 
  },
  summaryDate: { fontSize: 11, fontWeight: '600', color: '#3b82f6', marginTop: 2 },
  filterSection: { marginTop: 16 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  filterChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: '#fff', 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0', 
    marginRight: 8 
  },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },
  actionBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    paddingHorizontal: 20, 
    marginTop: 16, 
    marginBottom: 12 
  },
  searchContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    paddingHorizontal: 16, 
    height: 50, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },
  actionButton: { 
    width: 50, 
    height: 50, 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  content: { flex: 1, paddingHorizontal: 20 },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  
  // Card Styles
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 12, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  statusStrip: { width: 5 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 8 
  },
  wonumBadge: { 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  wonumText: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
  statusBadges: { flexDirection: 'row', gap: 4 },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 10 
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  description: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#0f172a', 
    marginBottom: 12, 
    lineHeight: 22 
  },
  
  // Info Grid 2x2 - Smaller boxes
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoBoxFull: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 13,
  },
  
  // Loading & Error States
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#93c5fd', fontWeight: '600' },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 32 
  },
  errorIcon: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#fee2e2', 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20 
  },
  errorTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  errorMessage: { 
    fontSize: 15, 
    color: '#64748b', 
    textAlign: 'center', 
    marginBottom: 24, 
    lineHeight: 22 
  },
  retryButton: { 
    borderRadius: 12, 
    overflow: 'hidden', 
    shadowColor: '#3b82f6', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4 
  },
  retryButtonGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 24, 
    paddingVertical: 14 
  },
  retryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  
  // Empty State
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 80 
  },
  emptyIcon: { 
    width: 100, 
    height: 100, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 50, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20 
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#94a3b8' },
});