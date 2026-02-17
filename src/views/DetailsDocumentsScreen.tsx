// src/views/DetailsDocumentsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = { route: RouteProp<RootStackParamList, 'DetailsDocuments'> };
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DetailsDocuments'>;

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

export default function DetailsDocumentsScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { workOrder } = route.params;

  const documents: any[] = workOrder?.docLinks ?? [];

  const renderDocument = ({ item }: { item: any }) => {
    // Nom du document = champ "document" saisi dans le formulaire
    // Mais on évite d'afficher juste un ID numérique
    let nomDocument = safeStr(item?.document);
    
    // Si c'est juste un nombre (ID), chercher le vrai nom ailleurs
    if (!nomDocument || nomDocument.match(/^\d+$/)) {
      const alternatives = [
        safeStr(item?.describedByDesc),
        safeStr(item?.docinfo?.document),
        safeStr(item?.docinfo?.doctitle),
        safeStr(item?.docinfo?.title),
        safeStr(item?.urlname)?.split('/').pop()?.split('?')[0],
        safeStr(item?.href)?.split('/').pop()?.split('?')[0],
      ];
      
      for (const alt of alternatives) {
        if (alt && !alt.match(/^\d+$/) && alt.length > 0) {
          nomDocument = decodeURIComponent(alt);
          break;
        }
      }
      
      if (!nomDocument || nomDocument.match(/^\d+$/)) {
        nomDocument = 'Sans nom';
      }
    }
    
    // Description = champ "description" saisi dans le formulaire
    const description = safeStr(item?.description) || 'Aucune description';

    return (
      <TouchableOpacity
        style={styles.documentCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DocDetails', { document: item })}
      >
        <View style={styles.cardContent}>
          {/* Icon et Titre */}
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <FeatherIcon name="file-text" size={24} color="#3b82f6" />
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.documentName} numberOfLines={1}>
                {nomDocument}
              </Text>
              <Text style={styles.documentSubtitle} numberOfLines={1}>
                Document
              </Text>
            </View>
            <FeatherIcon name="chevron-right" size={22} color="#cbd5e1" />
          </View>

          {/* Description */}
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText} numberOfLines={2}>
              {description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <FeatherIcon name="folder" size={48} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>Aucun document</Text>
      <Text style={styles.emptyText}>
        Il n'y a pas encore de documents attachés à cet ordre de travail
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1e40af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <FeatherIcon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Documents</Text>
            <Text style={styles.headerSubtitle}>OT #{workOrder?.wonum}</Text>
          </View>

          <View style={styles.badgeContainer}>
            {documents.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{documents.length}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Liste des documents */}
      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(item, index) => `doc-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
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
  badgeContainer: {
    minWidth: 42,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 36,
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  documentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  documentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  documentSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  descriptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
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
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});
