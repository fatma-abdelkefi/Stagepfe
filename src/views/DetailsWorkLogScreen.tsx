import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';

type RootStackParamList = any;
type Props = { route: RouteProp<RootStackParamList, 'DetailsWorkLog'> };

function fixHost(url: string) {
  return String(url || '').replace('http://192.168.1.202:9080', 'http://demo2.smartech-tn.com');
}
function formatDate(s?: string) {
  if (!s) return '-';
  return String(s).replace('T', ' ').replace(/:\d{2}\+\d{2}:\d{2}$/, '');
}

export default function DetailsWorkLogScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const workOrder = (route as any)?.params?.workOrder;

  const worklogs = useMemo(() => {
    const arr = (workOrder as any)?.workLogs ?? (workOrder as any)?.worklog ?? [];
    return [...arr].sort((a: any, b: any) => String(b?.createdate || '').localeCompare(String(a?.createdate || '')));
  }, [workOrder]);

  const [selected, setSelected] = useState<any>(null);

  return (
    <SafeAreaView style={detailsStyles.container}>
      <DetailsHeader title="Work Log" subtitle={`OT #${workOrder?.wonum ?? '-'}`} />

      <ScrollView contentContainerStyle={[detailsStyles.content, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
        {worklogs.length === 0 ? (
          <View style={detailsStyles.emptyContainer}>
            <FeatherIcon name="message-square" size={40} color="#cbd5e1" />
            <Text style={detailsStyles.emptyText}>Aucun Work Log</Text>
          </View>
        ) : (
          worklogs.map((wl: any) => {
            const summary = wl?.description || '—';
            const longText = wl?.description_longdescription?.ldtext ?? wl?.description_longdescription ?? '';
            const hasLong = !!String(longText || '').trim();

            return (
              <TouchableOpacity
                key={String(wl?.worklogid ?? wl?.localref ?? `${wl?.createdate ?? ''}-${Math.random()}`)}
                activeOpacity={0.85}
                onPress={() => setSelected({ ...wl, _longText: longText })}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={styles.left}>
                    <View style={styles.badge}>
                      <FeatherIcon name="file-text" size={14} color="#2563eb" />
                      <Text style={styles.badgeText}>{wl?.logtype_description || wl?.logtype || '—'}</Text>
                    </View>

                    <Text style={styles.summary} numberOfLines={2}>
                      {summary}
                    </Text>

                    <View style={styles.metaRow}>
                      <FeatherIcon name="user" size={14} color="#64748b" />
                      <Text style={styles.metaText}>{wl?.createby || '—'}</Text>
                      <Text style={styles.dot}>•</Text>
                      <FeatherIcon name="calendar" size={14} color="#64748b" />
                      <Text style={styles.metaText}>{formatDate(wl?.createdate)}</Text>
                    </View>
                  </View>

                  <View style={styles.right}>
                    <View style={[styles.pill, hasLong ? styles.pillOk : styles.pillWarn]}>
                      <Text style={styles.pillText}>{hasLong ? 'Détails' : 'Sans détails'}</Text>
                    </View>
                    <FeatherIcon name="chevron-right" size={20} color="#94a3b8" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails Work Log</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <FeatherIcon name="x" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMeta}>
              <Text style={styles.modalMetaText}>
                <Text style={styles.modalMetaLabel}>Créé par:</Text> {selected?.createby || '—'}
              </Text>
              <Text style={styles.modalMetaText}>
                <Text style={styles.modalMetaLabel}>Date:</Text> {formatDate(selected?.createdate)}
              </Text>
              <Text style={styles.modalMetaText}>
                <Text style={styles.modalMetaLabel}>Type:</Text> {selected?.logtype_description || selected?.logtype || '—'}
              </Text>
              <Text style={styles.modalMetaText}>
                <Text style={styles.modalMetaLabel}>ID:</Text> {String(selected?.worklogid ?? '—')}
              </Text>
            </View>

            <Text style={styles.modalSection}>Summary</Text>
            <View style={styles.textBox}>
              <Text style={styles.textBoxText}>{selected?.description || '—'}</Text>
            </View>

            <Text style={styles.modalSection}>Details</Text>
            <View style={[styles.textBox, { minHeight: 120 }]}>
              <Text style={styles.textBoxText}>{String(selected?._longText || '').trim() ? selected?._longText : '—'}</Text>
            </View>

            {!!selected?.localref && (
              <TouchableOpacity
                onPress={() => setSelected((prev: any) => ({ ...prev, _showRef: !prev?._showRef }))}
                style={styles.debugBtn}
              >
                <FeatherIcon name="link" size={14} color="#2563eb" />
                <Text style={styles.debugBtnText}>Voir localref</Text>
              </TouchableOpacity>
            )}

            {!!selected?._showRef && <Text style={styles.refText} selectable>{fixHost(selected?.localref)}</Text>}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },

  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: '#2563eb', fontWeight: '800', fontSize: 12 },

  summary: { marginTop: 10, fontSize: 15, fontWeight: '800', color: '#0f172a', lineHeight: 20 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  dot: { fontSize: 12, color: '#cbd5e1', marginHorizontal: 2 },

  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillOk: { backgroundColor: '#dcfce7' },
  pillWarn: { backgroundColor: '#fee2e2' },
  pillText: { fontSize: 12, fontWeight: '900', color: '#0f172a' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 18, padding: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  modalMeta: { marginTop: 10, gap: 4 },
  modalMetaText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  modalMetaLabel: { color: '#64748b' },

  modalSection: { marginTop: 14, fontSize: 13, fontWeight: '900', color: '#0f172a' },
  textBox: { marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  textBoxText: { fontSize: 13, color: '#0f172a', fontWeight: '600', lineHeight: 18 },

  debugBtn: { marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-start' },
  debugBtnText: { color: '#2563eb', fontWeight: '900', fontSize: 12 },
  refText: { marginTop: 8, fontSize: 11, color: '#334155', fontWeight: '600' },
});