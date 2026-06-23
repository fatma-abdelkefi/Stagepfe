import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import SuccessModal from '../../../shared/components/feedback/SuccessModal';
import ErrorModal from '../../../shared/components/feedback/ErrorModal';
import { checkAIAuthentication } from '../services/aiAuthService';

import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
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

function normalizeWorkOrderForNavigation(item: any) {
  const scheduledStart =
    item?.scheduledStart ||
    item?.scheduled_start ||
    item?.schedstart ||
    item?.scheduledstart ||
    item?.targetStart ||
    item?.target_start ||
    item?.targetstart ||
    item?.targstartdate ||
    null;

  const scheduledFinish =
    item?.scheduledFinish ||
    item?.scheduled_finish ||
    item?.schedfinish ||
    item?.scheduledfinish ||
    item?.targetFinish ||
    item?.target_finish ||
    item?.targetfinish ||
    item?.targcompdate ||
    null;

  return {
    ...item,

    wonum: String(item?.wonum || ''),
    siteid: String(item?.siteid || item?.site || 'BEDFORD'),

    scheduledStart,
    scheduledFinish,

    scheduled_start: scheduledStart,
    scheduled_finish: scheduledFinish,

    schedstart: item?.schedstart || scheduledStart,
    schedfinish: item?.schedfinish || scheduledFinish,
  };
}
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
  const [showAISuccessModal, setShowAISuccessModal] = useState(false);
const [showAIErrorModal, setShowAIErrorModal] = useState(false);
const [aiModalMessage, setAIModalMessage] = useState('');

  const showAtStart = !!route.params?.showPermissionsModal;
  const permissionsVM = useWorkOrdersPermissionsViewModel(showAtStart);


  const handleAIAuth = useCallback(async () => {
  const result = await checkAIAuthentication();

  if (result.success) {
    setAIModalMessage(
      result.message ||
        'Le service IA est disponible. Vous pouvez utiliser les fonctionnalités intelligentes.',
    );
    setShowAISuccessModal(true);
    return;
  }

  setAIModalMessage(
    result.message || "Impossible de contacter le service IA.",
  );
  setShowAIErrorModal(true);
}, []);

  const handleScan = useCallback(
    (barcode: string) => {
      setShowScanner(false);
      setBarcodeFilter(barcode);
      setActiveFilter('Tous');
      setSearch('');
      setSelectedDate(null);
    },
    [setActiveFilter, setBarcodeFilter, setSearch, setSelectedDate],
  );

  const handleOpenScanner = useCallback(async () => {
    const granted = await permissionsVM.ensureCameraPermission();

    if (!granted) {
      return;
    }

    setShowScanner(true);
  }, [permissionsVM]);

  const handleOpenDetails = useCallback(
    (item: any) => {
      const workOrder = normalizeWorkOrderForNavigation(item);

      if (!workOrder.wonum) {
        return;
      }

      navigation.navigate('WorkOrderDetails', {
        wonum: workOrder.wonum,
        siteid: workOrder.siteid,
        workOrder,
      });
    },
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      refetch();

      return undefined;
    }, [refetch]),
  );

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

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={refetch}
            style={styles.retryButtonWrap}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryGradient}
            >
              <FeatherIcon name="refresh-cw" size={15} color="#fff" />
              <AppText style={styles.retryText}>Réessayer</AppText>
            </LinearGradient>
          </TouchableOpacity>
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
        onAIAuth={handleAIAuth}
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
        onClearSearchSideEffects={() => {
          setBarcodeFilter(null);
          setSelectedDate(null);
          setActiveFilter('Tous');
        }}
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
            keyExtractor={(item, index) =>
              String(item?.wonum || item?.workorderid || index)
            }
            renderItem={({ item }) => (
              <WorkOrderCard
                item={item}
                formatDate={formatDate}
                onPress={() => handleOpenDetails(item)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.addButton}
        onPress={() => navigation.navigate('AddWorkOrder')}
      >
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addButtonGradient}
        >
          <FeatherIcon name="plus" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

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
      <SuccessModal
        visible={showAISuccessModal}
        title="IA connectée"
        message={aiModalMessage}
        onClose={() => setShowAISuccessModal(false)}
      />

      <ErrorModal
        visible={showAIErrorModal}
        title="IA indisponible"
        message={aiModalMessage}
        onClose={() => setShowAIErrorModal(false)}
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
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  addButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
});