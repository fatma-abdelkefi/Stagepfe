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
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import DatePicker from 'react-native-date-picker';
import LinearGradient from 'react-native-linear-gradient';
import BarcodeScanner from '../components/BarcodeScanner';
import { useWorkOrders, WorkOrder } from '../viewmodels/WorkOrdersViewModel';
import { getWorkOrders } from '../services/workOrdersService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

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

  // Fetch Maximo work orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const username = 'YOUR_MAXIMO_USER';
        const password = 'YOUR_MAXIMO_PASSWORD';
        const wos = await getWorkOrders(username, password);
        setData(wos);
      } catch (err: any) {
        console.error('Error fetching work orders:', err.message);
        setError('Erreur lors du chargement des ordres de travail');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    setBarcodeFilter(barcode);
    setActiveFilter('Tous');
    setSearch('');
    setSelectedDate(null);
  };

  const renderItem = ({ item }: { item: WorkOrder }) => {
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('WorkOrderDetails', { workOrder: item })}
        style={styles.card}
        activeOpacity={0.7}
      >
        {/* Status Indicator Strip */}
        <View
          style={[
            styles.statusStrip,
            {
              backgroundColor: item.completed
                ? '#10b981'
                : item.isUrgent
                ? '#ef4444'
                : '#3b82f6',
            },
          ]}
        />

        <View style={styles.cardContent}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.wonumBadge}>
              <Text style={styles.wonumText}>{item.wonum}</Text>
            </View>

            {/* Status Badges */}
            <View style={styles.statusBadges}>
              {item.completed && (
                <View style={[styles.statusBadge, styles.completedBadge]}>
                  <FeatherIcon name="check-circle" size={12} color="#fff" />
                  <Text style={styles.statusBadgeText}>Terminé</Text>
                </View>
              )}
              {item.isUrgent && !item.completed && (
                <View style={[styles.statusBadge, styles.urgentBadge]}>
                  <FeatherIcon name="alert-circle" size={12} color="#fff" />
                  <Text style={styles.statusBadgeText}>Urgent</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <FeatherIcon name="map-pin" size={14} color="#64748b" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Site</Text>
                <Text style={styles.infoValue}>{item.site || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <FeatherIcon name="package" size={14} color="#64748b" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Actif</Text>
                <Text style={styles.infoValue}>{item.asset || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Footer Row */}
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={styles.footerText}>{item.status || 'N/A'}</Text>
            </View>
            <View style={styles.footerItem}>
              <FeatherIcon name="clock" size={12} color="#94a3b8" />
              <Text style={styles.footerText}>{formatDate(item.scheduledStart)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'En cours': '#3b82f6',
      'Terminé': '#10b981',
      'En attente': '#f59e0b',
      'Annulé': '#ef4444',
    };
    return statusMap[status] || '#6b7280';
  };

  // Loading state
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
          <Text style={styles.loadingText}>Chargement...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <FeatherIcon name="alert-circle" size={48} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>Oups!</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              const fetchData = async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const username = 'YOUR_MAXIMO_USER';
                  const password = 'YOUR_MAXIMO_PASSWORD';
                  const wos = await getWorkOrders(username, password);
                  setData(wos);
                } catch (err: any) {
                  console.error('Error fetching work orders:', err.message);
                  setError('Erreur lors du chargement des ordres de travail');
                } finally {
                  setLoading(false);
                }
              };
              fetchData();
            }}
          >
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
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#000000', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Top Bar */}
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
              <Text style={styles.greeting}>Bonjour </Text>
              <Text style={styles.userName}>Smartech Team</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <FeatherIcon name="bell" size={22} color="#fff" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Task Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryCount}>{todayCount}</Text>
            <Text style={styles.summaryLabel}>Tâches du jour</Text>
          </View>
          <View style={styles.summaryRight}>
            <FeatherIcon name="calendar" size={20} color="#3b82f6" />
            <Text style={styles.summaryDate}>
              {new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Chips */}
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
                setSelectedDate(null);
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

      {/* Search and Actions */}
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

        <TouchableOpacity
          onPress={() => setOpenDatePicker(true)}
          style={styles.actionButton}
        >
          <FeatherIcon name="calendar" size={20} color="#3b82f6" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowScanner(true)}
          style={styles.actionButton}
        >
          <MaterialIcon name="qrcode-scan" size={22} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <DatePicker
        modal
        open={openDatePicker}
        date={selectedDate || new Date()}
        onConfirm={(date) => {
          setOpenDatePicker(false);
          setSelectedDate(date);
          setActiveFilter('Tous');
        }}
        onCancel={() => setOpenDatePicker(false)}
        mode="date"
      />

      <Modal visible={showScanner} animationType="slide">
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      </Modal>

      {/* Work Orders List */}
      <View style={styles.content}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FeatherIcon name="inbox" size={48} color="#cbd5e1" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  greeting: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    borderColor: '#1e3a8a',
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryCount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryRight: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  summaryDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  filterSection: {
    marginTop: 16,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
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
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
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
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
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
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },
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
    elevation: 3,
  },
  statusStrip: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  wonumBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  wonumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#10b981',
  },
  urgentBadge: {
    backgroundColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 14,
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#93c5fd',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#fee2e2',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
