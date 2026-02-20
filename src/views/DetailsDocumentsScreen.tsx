// src/views/DetailsDocumentsScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// ✅ centralisé
import { AppIcon, AppText, Colors, Spacing, Radius, Shadow, Gradients, Icons } from '../ui';

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
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <AppIcon name={Icons.folder} size={48} color={Colors.emptyGray} />
      </View>
      <AppText style={styles.emptyTitle}>Aucun document</AppText>
      <AppText style={styles.emptyText}>
        Il n&apos;y a pas encore de documents attachés à cet ordre de travail
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={[...Gradients.header]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.9}>
            <AppIcon name={Icons.back} size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <AppText style={styles.headerTitle}>Documents</AppText>
            <AppText style={styles.headerSubtitle}>OT #{workOrder?.wonum}</AppText>
          </View>

          <View style={styles.badgeContainer}>
            {documents.length > 0 && (
              <View style={styles.countBadge}>
                <AppText style={styles.countText}>{documents.length}</AppText>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Liste des documents */}
      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(_, index) => `doc-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.docBg },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radius.docHeader,
    borderBottomRightRadius: Radius.docHeader,
    ...Shadow.docHeader,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextContainer: { flex: 1, marginLeft: Spacing.lg },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },

  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },

  badgeContainer: { minWidth: 42, alignItems: 'flex-end' },

  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    minWidth: 36,
    alignItems: 'center',
  },

  countText: { fontSize: 14, fontWeight: '800', color: '#fff' },

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

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },

  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.docBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 15,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
