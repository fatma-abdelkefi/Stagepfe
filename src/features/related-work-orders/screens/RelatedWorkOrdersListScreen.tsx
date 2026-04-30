import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { Buffer } from 'buffer';

import type { RootStackParamList } from '../../../app/navigation/types';
import { useAuth } from '../../../app/providers/AuthProvider';
import { MAXIMO } from '../../../shared/config/maximoUrls';

import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import ListEmptyState from '../../../shared/ui/list-details/ListEmptyState';

type Props = {
  route: RouteProp<RootStackParamList, 'RelatedWorkOrdersList'>;
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  text: '#f8fafc',
  textSub: '#8b92b0',
  textMuted: '#4b5272',
  successBg: 'rgba(34,197,94,0.12)',
  successText: '#86efac',
  warningBg: 'rgba(245,158,11,0.12)',
  warningText: '#fcd34d',
};

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function getLongDescription(value: any): string {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value?.ldtext === 'string') {
    return value.ldtext.trim();
  }

  return '';
}

function buildBasicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getStatusColors(status: string) {
  const s = status.toUpperCase();

  if (s === 'COMP' || s === 'CLOSE') {
    return {
      bg: C.successBg,
      color: C.successText,
    };
  }

  return {
    bg: C.warningBg,
    color: C.warningText,
  };
}

async function fetchWorkOrderDetails(params: {
  wonum: string;
  username: string;
  password: string;
}) {
  const { wonum, username, password } = params;

  const where = encodeURIComponent(`wonum="${wonum}"`);
  const select = encodeURIComponent(
    'wonum,description,description_longdescription,status,siteid',
  );

  const url =
    `${MAXIMO.MXWO}` +
    `?lean=1` +
    `&oslc.where=${where}` +
    `&oslc.select=${select}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: buildBasicAuth(username, password),
      properties: '*',
    } as any,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  const json = text ? JSON.parse(text) : {};
  const member = Array.isArray(json?.member) ? json.member[0] : json;

  return {
    description: safeTrim(member?.description),
    details: getLongDescription(member?.description_longdescription),
    status: safeTrim(member?.status),
    siteid: safeTrim(member?.siteid),
  };
}

export default function RelatedWorkOrdersListScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { username, password } = useAuth();

  const { wonum, siteid, items } = route.params;

  const [detailsByWonum, setDetailsByWonum] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  const baseItems = useMemo(() => {
    return (items || []).map((item: any, index: number) => {
      const itemWonum = safeTrim(item?.wonum || item?.relatedreckey);

      const details =
        getLongDescription(item?.description_longdescription) ||
        getLongDescription(item?.details) ||
        getLongDescription(item?.longdescription);

      return {
        id: item.id ?? `related-wo-${index}`,
        wonum: itemWonum,
        relationship: safeTrim(item?.relationship),
        description: safeTrim(item?.description),
        details,
        status: safeTrim(item?.status),
        siteid: safeTrim(item?.siteid || siteid),
      };
    });
  }, [items, siteid]);

  useEffect(() => {
    const loadMissingDetails = async () => {
      if (!username || !password) return;

      const missingItems = baseItems.filter(
        item => item.wonum && !item.details,
      );

      if (missingItems.length === 0) return;

      try {
        setLoadingDetails(true);

        const result: Record<string, any> = {};

        for (const item of missingItems) {
          try {
            const details = await fetchWorkOrderDetails({
              wonum: item.wonum,
              username,
              password,
            });

            result[item.wonum] = details;
          } catch (e) {
            console.log('[RELATED WO DETAILS ERROR]', item.wonum, e);
          }
        }

        setDetailsByWonum(prev => ({
          ...prev,
          ...result,
        }));
      } finally {
        setLoadingDetails(false);
      }
    };

    loadMissingDetails();
  }, [baseItems, username, password]);

  const normalizedItems = useMemo(() => {
    return baseItems.map(item => {
      const extra = detailsByWonum[item.wonum] || {};

      return {
        ...item,
        description: item.description || extra.description || '',
        details: item.details || extra.details || '',
        status: item.status || extra.status || '',
        siteid: item.siteid || extra.siteid || siteid || '',
      };
    });
  }, [baseItems, detailsByWonum, siteid]);

  return (
    <ListDetailsLayout
      title="Ordres de travail liés"
      subtitle={`OT #${wonum}`}
      badgeText={`${normalizedItems.length} élément${
        normalizedItems.length !== 1 ? 's' : ''
      }`}
      onBack={() => navigation.goBack()}
      scroll={false}
    >
      {loadingDetails ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={C.accent} size="small" />
          <Text style={styles.loadingText}>Chargement des détails...</Text>
        </View>
      ) : null}

      {normalizedItems.length === 0 ? (
        <ListEmptyState
          title="Aucun ordre de travail lié"
          subtitle="Aucun ordre de travail lié disponible pour cette catégorie."
        />
      ) : (
        <FlatList
          data={normalizedItems}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusColors = getStatusColors(item.status);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}>
                    <FeatherIcon name="link" size={18} color={C.accent} />
                  </View>

                  <View style={styles.headerText}>
                    <Text style={styles.title}>OT #{item.wonum || '—'}</Text>
                    <Text style={styles.subtitle}>
                      {item.description || 'Sans description'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: statusColors.color },
                      ]}
                    >
                      {item.status || '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.relationBadge}>
                    <FeatherIcon
                      name="git-branch"
                      size={12}
                      color={C.accent}
                    />
                    <Text style={styles.relationText}>
                      {item.relationship || 'Relation non définie'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailsLabel}>DETAILS</Text>
                  <Text style={styles.detailsText}>
                    {item.details || 'Aucun détail disponible.'}
                  </Text>
                </View>
                <Text
                  style={styles.openText}
                  onPress={() =>
                    navigation.navigate('WorkOrderDetails', {
                      workOrder: {
                        wonum: item.wonum,
                        siteid: item.siteid || siteid,
                      },
                    })
                  }
                >
                  Voir détails
                </Text>
              </View>
            );
          }}
        />
      )}
    </ListDetailsLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 18,
  },

  loadingBox: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  loadingText: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: '600',
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(61,106,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: C.text,
    fontSize: 15,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 3,
    color: C.textSub,
    fontSize: 12,
    lineHeight: 17,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  metaRow: {
    flexDirection: 'row',
    marginTop: 12,
  },

  relationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  relationText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '700',
  },

  detailsBox: {
    marginTop: 12,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 10,
    padding: 10,
  },

  detailsLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },

  detailsText: {
    color: C.textSub,
    fontSize: 13,
    lineHeight: 20,
  },

  footerRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  footerText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  footerValue: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
  },

  openText: {
    marginTop: 12,
    color: C.accent,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});