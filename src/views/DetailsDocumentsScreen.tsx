// src/views/DetailsDocumentsScreen.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';

import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// ✅ keep your existing central UI
import { AppIcon, AppText, Colors, Spacing, Radius, Shadow, Icons } from '../ui';

// ✅ unified header + details styles
import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';

type Props = { route: RouteProp<RootStackParamList, 'DetailsDocuments'> };
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DetailsDocuments'>;

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isNumericOnly(s: string) {
  return !!s && /^\d+$/.test(s);
}

function extractFileNameFromUrl(url: string) {
  const last = url.split('/').pop() || '';
  return last.split('?')[0];
}

export default function DetailsDocumentsScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { workOrder } = route.params;

  const documents: any[] = useMemo(() => workOrder?.docLinks ?? [], [workOrder]);

  const resolveDocumentName = (item: any) => {
    let name = safeStr(item?.document);

    // Si vide ou uniquement numérique, on cherche un meilleur nom
    if (!name || isNumericOnly(name)) {
      const alternatives = [
        safeStr(item?.describedByDesc),
        safeStr(item?.docinfo?.document),
        safeStr(item?.docinfo?.doctitle),
        safeStr(item?.docinfo?.title),
        safeStr(item?.urlname) ? extractFileNameFromUrl(safeStr(item?.urlname)) : '',
        safeStr(item?.href) ? extractFileNameFromUrl(safeStr(item?.href)) : '',
      ];

      for (const alt of alternatives) {
        const a = safeStr(alt);
        if (a && !isNumericOnly(a)) {
          try {
            name = decodeURIComponent(a);
          } catch {
            name = a;
          }
          break;
        }
      }

      if (!name || isNumericOnly(name)) name = 'Sans nom';
    }

    return name;
  };

  const renderDocument = ({ item }: { item: any }) => {
    const nomDocument = resolveDocumentName(item);
    const description = safeStr(item?.description) || 'Aucune description';

    return (
      <TouchableOpacity
        style={styles.documentCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DocDetails', { document: item })}
      >
        <View style={styles.cardContent}>
          {/* Icon + titre */}
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <AppIcon name={Icons.fileText} size={24} color={Colors.primary} />
            </View>

            <View style={styles.titleSection}>
              <AppText style={styles.documentName} numberOfLines={1}>
                {nomDocument}
              </AppText>
              <AppText style={styles.documentSubtitle} numberOfLines={1}>
                Document
              </AppText>
            </View>

            <AppIcon name={Icons.chevronRight} size={22} color={Colors.placeholder} />
          </View>

          {/* Description */}
          <View style={styles.descriptionBox}>
            <AppText style={styles.descriptionLabel}>Description</AppText>
            <AppText style={styles.descriptionText} numberOfLines={2}>
              {description}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={detailsStyles.emptyContainer}>
      <AppIcon name={Icons.folder} size={64} color="#cbd5e1" />
      <AppText style={detailsStyles.emptyText}>
        Il n&apos;y a pas encore de documents attachés à cet ordre de travail
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={detailsStyles.container}>
      {/* ✅ Unified header (same as all details screens) */}
      <DetailsHeader title="Documents" subtitle={`OT #${workOrder?.wonum ?? '-'}`} />

      {/* ✅ List (unchanged logic) */}
      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(_, index) => `doc-${index}`}
        contentContainerStyle={[styles.listContainer, documents.length === 0 && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ keep same background system but align with details design
  listContainer: { padding: Spacing.xl, paddingBottom: 32 },

  documentCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    marginBottom: 14,
    ...Shadow.docCard,
  },

  cardContent: { padding: Spacing.lg },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.softBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },

  titleSection: { flex: 1 },

  documentName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },

  documentSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },

  descriptionBox: {
    backgroundColor: Colors.bg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },

  descriptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  descriptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
});