import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/types';

import { useAuth } from '../../../app/providers/AuthProvider';
import { useWorkOrdersViewModel } from '../viewmodels/useWorkOrdersViewModel';
import { useWorkOrdersPermissionsViewModel } from '../viewmodels/useWorkOrdersPermissionsViewModel';

import WorkOrderCard from '../components/WorkOrderCard';
import WorkOrdersHeader from '../components/WorkOrdersHeader';
import WorkOrdersFilters from '../components/WorkOrdersFilters';
import LogoutConfirmModal from '../components/LogoutConfirmModal';

import BarcodeScanner from '../../../shared/components/common/BarcodeScanner';
import CustomCalendar from '../../../shared/components/common/CustomCalendar';
import AppPermissionsModal from '../../startup/components/AppPermissionsModal';

import AppText from '../../../shared/components/typography/AppText';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WorkOrders'>;

export default function WorkOrdersScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { clearSession } = useAuth();

  const {
    filteredData,
    loading,
    error,
    refetch,
    activeFilter,
    setActiveFilter,
    search,
    setSearch,
    selectedDate,
    setSelectedDate,
    setBarcodeFilter,
    todayCount,
    formatDate,
  } = useWorkOrdersViewModel();

  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const showAtStart = !!route.params?.showPermissionsModal;

  const permissionsVM = useWorkOrdersPermissionsViewModel(showAtStart);

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    setBarcodeFilter(barcode);
    setActiveFilter('Tous');
    setSearch('');
    setSelectedDate(null);
  };

  const handleOpenScanner = async () => {
    const granted = await permissionsVM.ensureCameraPermission();

    if (!granted) {
      return;
    }

    setShowScanner(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <AppText style={styles.loadingText}>
            Chargement des ordres...
          </AppText>
        </View>

        <AppPermissionsModal
          visible={permissionsVM.visible}
          mode={permissionsVM.mode}
          blockedCamera={permissionsVM.blockedCamera}
          blockedMicrophone={permissionsVM.blockedMicrophone}
          onConfirm={permissionsVM.confirmSelection}
          onLater={permissionsVM.closeModal}
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.errorIconWrap}>
            <FeatherIcon name="alert-circle" size={44} color="#f87171" />
          </View>

          <AppText style={styles.errorTitle}>Oups !</AppText>
          <AppText style={styles.errorMessage}>{error}</AppText>

          <View style={styles.retryButtonWrap}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryGradient}
            >
              <FeatherIcon name="refresh-cw" size={15} color="#fff" />
              <AppText onPress={refetch} style={styles.retryText}>
                Réessayer
              </AppText>
            </LinearGradient>
          </View>
        </View>

        <AppPermissionsModal
          visible={permissionsVM.visible}
          mode={permissionsVM.mode}
          blockedCamera={permissionsVM.blockedCamera}
          blockedMicrophone={permissionsVM.blockedMicrophone}
          onConfirm={permissionsVM.confirmSelection}
          onLater={permissionsVM.closeModal}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <WorkOrdersHeader
        todayCount={todayCount}
        selectedDate={selectedDate}
        formatDate={formatDate}
        onOpenCalendar={() => setOpenDatePicker(true)}
        onLogout={() => setShowLogoutConfirm(true)}
      />

      <WorkOrdersFilters
        search={search}
        setSearch={setSearch}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        selectedDate={selectedDate}
        onOpenScanner={handleOpenScanner}
        onResetCalendarFilter={() => setSelectedDate(null)}
        onResetBarcodeFilter={() => setBarcodeFilter(null)}
        onClearSearchSideEffects={() => {}}
      />

      <CustomCalendar
        visible={openDatePicker}
        selectedDate={selectedDate}
        onConfirm={date => {
          setOpenDatePicker(false);
          setSelectedDate(date);
          setActiveFilter('Tous');
        }}
        onCancel={() => setOpenDatePicker(false)}
      />

      <Modal visible={showScanner} animationType="slide">
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      </Modal>

      <View style={styles.content}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <FeatherIcon name="inbox" size={40} color="#475569" />
            </View>

            <AppText style={styles.emptyTitle}>Aucun ordre trouvé</AppText>
            <AppText style={styles.emptySubtitle}>
              Essayez de modifier vos filtres
            </AppText>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={item => item.wonum}
            renderItem={({ item }) => (
              <WorkOrderCard
                item={item}
                formatDate={formatDate}
                onPress={() =>
                  navigation.navigate('WorkOrderDetails', {
                    workOrder: item,
                  })
                }
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <LogoutConfirmModal
        visible={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await clearSession();
        }}
      />

      <AppPermissionsModal
        visible={permissionsVM.visible}
        mode={permissionsVM.mode}
        blockedCamera={permissionsVM.blockedCamera}
        blockedMicrophone={permissionsVM.blockedMicrophone}
        onConfirm={permissionsVM.confirmSelection}
        onLater={permissionsVM.closeModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 24,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#60a5fa',
    fontWeight: '600',
  },

  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButtonWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  retryText: {
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
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#475569',
  },
});