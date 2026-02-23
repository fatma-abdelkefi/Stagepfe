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
  changeActivityStatus,
  getWorkOrderStatusListFR,
  getActivityStatusListFR,
  normalizeMaximoHref,
  DEFAULT_ACTIVITY_DOMAIN_ID,
  StatusFR,
} from '../services/statusService';

type ActivityCtx = {
  taskid?: any;
  wonum?: any;
  siteid?: any;
  workorderid?: any;
};

type Props = {
  visible: boolean;
  entityType: 'WO' | 'ACTIVITY';
  currentStatus: string;
  href: string;
  wonum?: string;
  siteid?: string;
  activityCtx?: ActivityCtx;
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

function upper(s?: string): string {
  return safeTrim(s).toUpperCase();
}

function isFinalStatus(status?: string): boolean {
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
  activityCtx,
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

  // Load status list when modal opens
  useEffect(() => {
    if (!visible || !username || !password) return;

    const cleanHref = normalizeMaximoHref(href);
    console.log('[MODAL][STATUS] open', {
      entityType,
      currentStatus,
      locked: !!locked,
      wonum,
      siteid,
      href,
      hrefClean: cleanHref,
      activityCtx,
    });

    let cancelled = false;

    (async () => {
      try {
        setLoadingList(true);
        const res =
          entityType === 'ACTIVITY'
            ? await getActivityStatusListFR(
                username,
                password,
                activityDomainId || DEFAULT_ACTIVITY_DOMAIN_ID
              )
            : await getWorkOrderStatusListFR(username, password);

        if (!cancelled) setList(res);
      } catch (e: any) {
        if (!cancelled) {
          Alert.alert('Erreur', e?.message || 'Impossible de charger la liste des statuts');
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, entityType, username, password, activityDomainId]);

  const currentLabel = useMemo(() => {
    const cur = upper(currentStatus);
    const found =
      list.find((x) => upper(x.code) === cur) ||
      list.find((x) => upper(x.value) === cur);
    return found?.libelle || '';
  }, [list, currentStatus]);

  const options = useMemo(() => {
    const cur = upper(currentStatus);
    return list.map((s) => ({
      ...s,
      isCurrent: upper(s.value) === cur || upper(s.code) === cur,
    }));
  }, [list, currentStatus]);

  function labelForCode(code: string): string {
    const c = upper(code);
    const found =
      list.find((x) => upper(x.value) === c) ||
      list.find((x) => upper(x.code) === c);
    return found?.libelle || code;
  }

  const handlePick = async (item: StatusFR) => {
    if (submitting) return;

    if (locked || isFinalStatus(currentStatus)) {
      Alert.alert(
        'Statut verrouillé',
        `Impossible de changer le statut (${upper(currentStatus)}).`
      );
      return;
    }

    if (!username || !password) {
      Alert.alert('Erreur', 'Identifiants manquants');
      return;
    }

    setSubmitting(true);
    try {
      let confirmedCode: string;

      if (entityType === 'ACTIVITY') {
        // ── Activity: resolve localref then PATCH ──────────────────────────────
        if (!activityCtx?.taskid) {
          throw new Error('taskid manquant pour le changement de statut d\'activité');
        }

        confirmedCode = await changeActivityStatus(
          activityCtx,
          item.value,
          username,
          password,
          { memo: 'Changement via mobile' }
        );
      } else {
        // ── Work Order: PATCH directly on WO href ──────────────────────────────
        const cleanHref = normalizeMaximoHref(href);
        if (!cleanHref) throw new Error('href WO manquant ou invalide');

        // changeStatusByHref already confirms the new status internally via GET —
        // no need to call fetchStatusByHref again after this
        confirmedCode = await changeStatusByHref(
          cleanHref,
          item.value,
          username,
          password,
          { memo: 'Changement via mobile' }
        );
      }

      const newLabel = labelForCode(confirmedCode) || item.libelle || confirmedCode;

      onClose();
      onSuccess({ code: confirmedCode, label: newLabel });
    } catch (e: any) {
      console.log('[MODAL][STATUS] change error=', e?.message || e);
      Alert.alert('Statut non changé', e?.message || 'Échec changement statut');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Changer le statut {entityType === 'ACTIVITY' ? "d'activité" : 'OT'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={submitting}>
              <FeatherIcon name="x" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Statut actuel:{' '}
            {currentLabel
              ? `${currentLabel} (${upper(currentStatus)})`
              : upper(currentStatus) || '-'}
          </Text>

          {/* Status list */}
          {loadingList ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Chargement des statuts...</Text>
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(it) => it.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  disabled={submitting || !!locked}
                  onPress={() => handlePick(item)}
                  style={[styles.row, item.isCurrent && styles.rowActive]}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.rowTitle, item.isCurrent && styles.rowTitleActive]}
                    >
                      {item.libelle}
                    </Text>
                  </View>

                  {item.isCurrent ? (
                    <FeatherIcon name="check-circle" size={18} color="#10b981" />
                  ) : (
                    <FeatherIcon name="chevron-right" size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              style={{ maxHeight: 340 }}
            />
          )}

          <View style={{ height: 12 }} />

          {/* Submitting indicator */}
          {submitting && (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.submittingText}>Changement en cours...</Text>
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity
            disabled={submitting}
            onPress={onClose}
            style={{ borderRadius: 12, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={['#e2e8f0', '#cbd5e1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cancelBtn}
            >
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
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
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
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  rowActive: { backgroundColor: '#f0fdf4' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowTitleActive: { color: '#065f46' },
  rowCode: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  sep: { height: 1, backgroundColor: '#eef2f7' },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  submittingText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
});
