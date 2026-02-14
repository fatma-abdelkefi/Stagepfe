import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  route: RouteProp<RootStackParamList, 'DocDetails'>;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DocDetails'>;

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

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

function getDocName(item: any): string {
  const di = pickDocInfo(item);
  const title =
    safeStr(di?.doctitle) ||
    safeStr(di?.title) ||
    safeStr(item?.doctitle) ||
    safeStr(item?.title);

  const doc = safeStr(di?.document) || safeStr(item?.document);
  const link = getLink(item);
  const file = filenameFromUrl(link);

  return title || doc || file || 'Document sans nom';
}

function getDescription(item: any): string {
  const di = pickDocInfo(item);
  return safeStr(di?.description) || safeStr(item?.description) || 'Aucune description fournie';
}

function getCreateDate(item: any): string {
  const di = pickDocInfo(item);
  return (
    safeStr(di?.createdate) ||
    safeStr(item?.createdate) ||
    safeStr(di?.creationdate) ||
    safeStr(item?.creationdate) ||
    'Date non disponible'
  );
}

export default function DocDetailsScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { document } = route.params;

  const url = getLink(document);
  const docName = getDocName(document);
  const description = getDescription(document);
  const createdDate = getCreateDate(document);

  const handleOpen = async () => {
    if (!url) {
      Alert.alert('Erreur', 'Aucun lien disponible pour ce document');
      return;
    }

    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert('Erreur', "Impossible d'ouvrir ce lien");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir le document");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FeatherIcon name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {docName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.previewCard}>
          <FeatherIcon name="file-text" size={64} color="#6366f1" />
          <Text style={styles.previewName} numberOfLines={2}>
            {docName}
          </Text>
          <Text style={styles.previewId}>{url ? `ID: ${filenameFromUrl(url)}` : '—'}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Détails du document</Text>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Nom du document</Text>
            <Text style={styles.value} numberOfLines={2}>
              {docName}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{description}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Date de création</Text>
            <Text style={styles.value}>{createdDate}</Text>
          </View>

          {url ? (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Lien</Text>
              <Text style={[styles.value, styles.link]} numberOfLines={3}>
                {url}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.openButton, !url && styles.openButtonDisabled]}
          onPress={handleOpen}
          disabled={!url}
        >
          <FeatherIcon name="external-link" size={20} color="#fff" />
          <Text style={styles.openButtonText}>
            {url ? 'Ouvrir le document' : 'Lien non disponible'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#6366f1',
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  scroll: { flex: 1, padding: 16 },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  previewId: { fontSize: 15, color: '#6b7280' },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16 },
  detailRow: { marginBottom: 16 },
  label: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  value: { fontSize: 16, color: '#111827', lineHeight: 22 },
  link: { color: '#6366f1', textDecorationLine: 'underline' },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  openButtonDisabled: { backgroundColor: '#d1d5db' },
  openButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
