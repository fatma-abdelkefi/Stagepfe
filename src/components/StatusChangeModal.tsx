// src/components/StatusChangeModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import {
  changeStatusByHref,
  fetchStatusByHref,
  getWorkOrderStatusListFR,
  getActivityStatusListFR,
  DEFAULT_ACTIVITY_DOMAIN_ID,
  StatusFR,
  normalizeMaximoHref,
} from '../services/statusService';

type Props = {
  visible: boolean;
  entityType: 'WO' | 'ACTIVITY';

  currentStatus: string; // code (WAPPR, INPRG, ...)
  href: string;

  // ✅ optional context if you want later
  wonum?: string;
  siteid?: string;

  username: string;
  password: string;

  locked?: boolean;

  onClose: () => void;
  onSuccess: (x: { code: string; label: string }) => void;

  activityDomainId?: string;
};

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

export default function StatusChangeModal({
  visible,
  entityType,
  currentStatus,
  href,
  wonum,
  siteid,
  username,
  password,
  locked,
  onClose,
  onSuccess,
  activityDomainId,
}: Props) {
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState<StatusFR[]>([]);

  // Load status list in FR
  useEffect(() => {
    if (!visible) return;
    if (!username || !password) return;

    const cleanHref = normalizeMaximoHref(href);
    console.log('[MODAL][STATUS] open', {
      entityType,
      currentStatus,
      locked: !!locked,
      wonum,
      siteid,
      href,
      hrefClean: cleanHref,
      activityDomainId,
    });

    (async () => {
      try {
        setLoadingList(true);

        const res =
          entityType === 'ACTIVITY'
            ? await getActivityStatusListFR(username, password, activityDomainId || DEFAULT_ACTIVITY_DOMAIN_ID)
            : await getWorkOrderStatusListFR(username, password);

        setList(res);
      } catch (e: any) {
        Alert.alert('Erreur', e?.message || 'Impossible de charger la liste des statuts');
      } finally {
        setLoadingList(false);
      }
    })();
  }, [visible, entityType, username, password, activityDomainId, href, currentStatus, locked, wonum, siteid]);

  const currentLabel = useMemo(() => {
    const cur = upper(currentStatus);
    const found = list.find((x) => upper(x.code) === cur) || list.find((x) => upper(x.value) === cur);
    return found?.libelle || '';
  }, [list, currentStatus]);

  const options = useMemo(() => {
    const cur = upper(currentStatus);
    return list.map((s) => ({
      ...s,
      isCurrent: upper(s.value) === cur || upper(s.code) === cur,
    }));
  }, [list, currentStatus]);

  const handlePick = async (item: StatusFR) => {
    if (submitting) return;

    console.log('[MODAL][STATUS] pick', {
      libelle: item.libelle,
      code: item.code,
      value: item.value,
      current: currentStatus,
      locked: !!locked,
    });

    if (locked || isFinalStatus(currentStatus)) {
      Alert.alert('Statut verrouillé', `Impossible de changer le statut (${upper(currentStatus)}).`);
      return;
    }

    if (!username || !password) {
      Alert.alert('Erreur', 'Identifiants manquants');
      return;
    }

    const cleanHref = normalizeMaximoHref(href);
    if (!cleanHref) {
      Alert.alert('Erreur', 'href manquant');
      return;
    }

    setSubmitting(true);
    try {
      // ✅ VERY IMPORTANT: send synonym VALUE (item.value), not code
      await changeStatusByHref(cleanHref, item.value, username, password, {
        memo: 'Changement via mobile',
      });

      // ✅ verify
      const confirmed = await fetchStatusByHref(cleanHref, username, password);
      if (!confirmed?.status) throw new Error("Impossible de vérifier le statut après changement.");

      onClose();

      // label in FR:
      const newLabel =
        (list.find((x) => upper(x.value) === upper(confirmed.status)) ||
          list.find((x) => upper(x.code) === upper(confirmed.status)))?.libelle || item.libelle || confirmed.status;

      onSuccess({ code: confirmed.status, label: newLabel });
    } catch (e: any) {
      console.log('[MODAL][STATUS] change error=', e?.message || e);
      Alert.alert('Statut non changé', e?.message || 'Échec changement statut');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Changer le statut {entityType === 'ACTIVITY' ? "d'activité" : 'OT'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FeatherIcon name="x" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Statut actuel: {currentLabel ? `${currentLabel} (${upper(currentStatus)})` : upper(currentStatus) || '-'}
          </Text>

          {loadingList ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={{ marginTop: 10, fontWeight: '600', color: '#475569' }}>Chargement des statuts...</Text>
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  disabled={submitting || !!locked}
                  onPress={() => handlePick(item)}
                  style={[styles.row, item.isCurrent && styles.rowActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, item.isCurrent && styles.rowTitleActive]}>{item.libelle}</Text>
                    <Text style={styles.rowCode}>code: {item.code} • value: {item.value}</Text>
                  </View>

                  {item.isCurrent ? (
                    <FeatherIcon name="check-circle" size={18} color="#10b981" />
                  ) : (
                    <FeatherIcon name="chevron-right" size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          )}

          <View style={{ height: 12 }} />

          {submitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Changement en cours...</Text>
            </View>
          )}

          <TouchableOpacity disabled={submitting} onPress={onClose} style={{ borderRadius: 12, overflow: 'hidden' }}>
            <LinearGradient colors={['#e2e8f0', '#cbd5e1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Fermer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  rowActive: { backgroundColor: '#f0fdf4' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowTitleActive: { color: '#065f46' },
  rowCode: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  sep: { height: 1, backgroundColor: '#eef2f7' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  loadingText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
});