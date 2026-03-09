// src/screens/DetailsWorkLogScreen.tsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Pressable,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { WebView } from 'react-native-webview';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';
import { useAuth } from '../context/AuthContext';
import { getWorkLogByLocalRef } from '../services/worklogService';

type RootStackParamList = any;
type Props = { route: RouteProp<RootStackParamList, 'DetailsWorkLog'> };

function formatDate(s?: string) {
  if (!s) return '-';

  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);

  const pad = (n: number) => String(n).padStart(2, '0');

  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function extractLongText(wl: any) {
  return wl?.description_longdescription?.ldtext ?? wl?.description_longdescription ?? '';
}

function buildHtmlPreview(html: string) {
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 10px;
        font-family: Arial, sans-serif;
        color: #0f172a;
        font-size: 14px;
        line-height: 1.5;
        background: #fff;
      }
      p { margin: 0 0 10px 0; }
      ul, ol { padding-left: 20px; }
      blockquote {
        margin: 8px 0;
        padding-left: 12px;
        border-left: 3px solid #cbd5e1;
        color: #475569;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      a {
        color: #2563eb;
      }
    </style>
  </head>
  <body>${html || '—'}</body>
  </html>
  `;
}

export default function DetailsWorkLogScreen({ route }: Props) {
  const workOrder = (route as any)?.params?.workOrder;
  const { username, password, authLoading } = useAuth();

  const worklogs = useMemo(() => {
    const arr = (workOrder as any)?.workLogs ?? (workOrder as any)?.worklog ?? [];
    return [...arr].sort((a: any, b: any) =>
      String(b?.createdate || '').localeCompare(String(a?.createdate || ''))
    );
  }, [workOrder]);

  const [selected, setSelected] = useState<any>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const closeModal = useCallback(() => {
    setSelected(null);
    setLoadingSelected(false);
  }, []);

  const openWorklog = useCallback(
    async (wl: any) => {
      const longText = extractLongText(wl);
      setSelected({ ...wl, _longText: longText });

      const hasDesc = !!String(wl?.description || '').trim();
      const hasCreateBy = !!String(wl?.createby || '').trim();
      const hasCreateDate = !!String(wl?.createdate || '').trim();
      const hasLong = !!String(longText || '').trim();

      if (hasDesc && hasCreateBy && hasCreateDate && hasLong) return;

      const localref = String(wl?.localref || '').trim();
      if (!localref) return;

      if (authLoading || !username || !password) {
        Alert.alert('Session', 'Veuillez vous connecter.');
        return;
      }

      setLoadingSelected(true);
      try {
        const full = await getWorkLogByLocalRef({ localref, username, password });
        if (!full) return;

        const fullLong = extractLongText(full);

        setSelected((prev: any) => ({
          ...(prev || {}),
          ...(full || {}),
          _longText: fullLong,
        }));
      } catch (e: any) {
        console.log('[WORKLOG] localref fetch error:', e?.message || e);
      } finally {
        setLoadingSelected(false);
      }
    },
    [authLoading, username, password]
  );

  const renderItem = ({ item: wl }: { item: any }) => {
    const summary = wl?.description || '—';
    const longText = extractLongText(wl);
    const hasLong = !!String(longText || '').trim();

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => openWorklog(wl)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.left}>
            <View style={styles.badge}>
              <FeatherIcon name="file-text" size={14} color="#2563eb" />
              <Text style={styles.badgeText}>
                {wl?.logtype_description || wl?.logtype || '—'}
              </Text>
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
              <Text style={[styles.pillText, hasLong ? styles.pillTextOk : styles.pillTextWarn]}>
                {hasLong ? 'Détails' : 'Sans détails'}
              </Text>
            </View>
            <View style={styles.chevronBox}>
              <FeatherIcon name="chevron-right" size={18} color="#64748b" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={detailsStyles.container}>
      <DetailsHeader title="Work Log" subtitle={`OT #${workOrder?.wonum ?? '-'}`} />

      <FlatList
        data={worklogs}
        keyExtractor={(wl, index) =>
          String(wl?.worklogid ?? wl?.localref ?? wl?.href ?? wl?.createdate ?? index)
        }
        renderItem={renderItem}
        contentContainerStyle={[
          detailsStyles.content,
          worklogs.length === 0 ? styles.emptyListContent : { paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        ListEmptyComponent={
          <View style={detailsStyles.emptyContainer}>
            <FeatherIcon name="message-square" size={40} color="#cbd5e1" />
            <Text style={detailsStyles.emptyText}>Aucun Work Log</Text>
          </View>
        }
      />

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeModal} />

          <View style={styles.sheet}>
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.sheetIcon}>
                  <FeatherIcon name="file-text" size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Détails Work Log</Text>
                  <Text style={styles.sheetSubtitle}>
                    {selected?.logtype_description || selected?.logtype || '—'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={closeModal} style={styles.closeBtn} activeOpacity={0.8}>
                <FeatherIcon name="x" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.metaCard}>
              <View style={styles.metaItem}>
                <FeatherIcon name="user" size={14} color="#64748b" />
                <Text style={styles.metaItemLabel}>Créé par</Text>
                <Text style={styles.metaItemValue}>{selected?.createby || '—'}</Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaItem}>
                <FeatherIcon name="calendar" size={14} color="#64748b" />
                <Text style={styles.metaItemLabel}>Date</Text>
                <Text style={styles.metaItemValue}>{formatDate(selected?.createdate)}</Text>
              </View>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              bounces={false}
            >
              {loadingSelected ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>Chargement des détails...</Text>
                </View>
              ) : null}

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Résumé</Text>
                <Text style={styles.sectionText}>{selected?.description || '—'}</Text>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Détails</Text>
                <View style={styles.htmlPreviewBox}>
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: buildHtmlPreview(String(selected?._longText || '')) }}
                    scrollEnabled={false}
                    nestedScrollEnabled
                    style={styles.htmlPreviewWebview}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { flex: 1 },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },

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
  badgeText: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 12,
  },

  summary: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 21,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  dot: {
    fontSize: 12,
    color: '#cbd5e1',
    marginHorizontal: 2,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillOk: { backgroundColor: '#dcfce7' },
  pillWarn: { backgroundColor: '#fee2e2' },
  pillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  pillTextOk: { color: '#166534' },
  pillTextWarn: { color: '#991b1b' },

  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  sheet: {
    height: '82%',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  sheetIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaItem: {
    flex: 1,
    gap: 4,
  },
  metaItemLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  metaItemValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '800',
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },

  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    lineHeight: 20,
  },

  htmlPreviewBox: {
    height: 260,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  htmlPreviewWebview: {
    backgroundColor: 'transparent',
  },
});