import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  route: RouteProp<RootStackParamList, 'DetailsDocuments'>;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DetailsDocuments'>;

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

// docinfo can be object or {member:[...]}
function pickDocInfo(item: any): any {
  const di = item?.docinfo;
  if (Array.isArray(di?.member) && di.member.length) return di.member[0];
  if (di && typeof di === 'object') return di;
  return null;
}

function getLink(item: any): string {
  const di = pickDocInfo(item);
  return (
    safeStr(item?.href) ||
    safeStr(di?.href) ||
    safeStr(item?.urlname) ||
    safeStr(di?.urlname) ||
    ''
  );
}

function filenameFromUrl(url: string): string {
  if (!url) return '';
  const clean = url.split('?')[0].split('#')[0];
  const last = clean.split('/').pop() || '';
  return last ? decodeURIComponent(last) : '';
}

function getDisplayName(item: any): string {
  const di = pickDocInfo(item);

  // Priority: docinfo doctitle/title -> item doctitle/title -> item.document -> url filename -> id
  const title =
    safeStr(di?.doctitle) ||
    safeStr(di?.title) ||
    safeStr(item?.doctitle) ||
    safeStr(item?.title);

  const doc = safeStr(di?.document) || safeStr(item?.document);
  const desc = safeStr(di?.description) || safeStr(item?.description);

  const link = getLink(item);
  const file = filenameFromUrl(link);

  return title || doc || file || desc || 'Document sans nom';
}

function getDescription(item: any): string {
  const di = pickDocInfo(item);
  return safeStr(di?.description) || safeStr(item?.description) || 'Aucune description';
}

function getCreateDate(item: any): string {
  const di = pickDocInfo(item);
  return (
    safeStr(di?.createdate) ||
    safeStr(item?.createdate) ||
    safeStr(di?.creationdate) ||
    safeStr(item?.creationdate) ||
    ''
  );
}

export default function DetailsDocumentsScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { workOrder } = route.params;
  const documents = workOrder?.docLinks ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FeatherIcon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents - #{workOrder?.wonum}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FeatherIcon name="inbox" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucun document attaché</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.sectionInfo}>
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </Text>

            {documents.map((item: any, index: number) => {
              const name = getDisplayName(item);
              const desc = getDescription(item);
              const date = getCreateDate(item);
              const link = getLink(item);

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.itemCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('DocDetails', { document: item })}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.iconContainer}>
                      <FeatherIcon name="file-text" size={24} color="#3b82f6" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.title} numberOfLines={1}>
                        {name}
                      </Text>

                      {!!date ? (
                        <Text style={styles.subtitle} numberOfLines={1}>
                          Ajouté le {date}
                        </Text>
                      ) : (
                        <Text style={styles.subtitleMuted}>Date non disponible</Text>
                      )}
                    </View>
                  </View>

                  <Text style={styles.description} numberOfLines={2}>
                    {desc}
                  </Text>

                  {!!link && (
                    <Text style={styles.urlHint} numberOfLines={1}>
                      {filenameFromUrl(link) || link}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#3b82f6',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 16 },
  sectionInfo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 16,
  },
  listContainer: { paddingBottom: 24 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#3b82f6', marginTop: 4, fontWeight: '600' },
  subtitleMuted: { fontSize: 13, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  description: { fontSize: 15, color: '#334155', lineHeight: 22 },
  urlHint: { marginTop: 10, fontSize: 12, color: '#94a3b8' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
});
