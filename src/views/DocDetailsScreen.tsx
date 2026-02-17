// src/views/DocDetailsScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import { RootStackParamList } from '../navigation/AppNavigator';
import { rewriteDoclinkUrl, metaToDoclinkUrl } from '../services/workOrderDetailsService';

type Props = {
  route: RouteProp<RootStackParamList, 'DocDetails'>;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DocDetails'>;

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function getOpenUrl(item: any): string {
  const raw =
    safeStr(item?.href) ||
    safeStr(item?.docinfo?.href) ||
    safeStr(item?.urlname) ||
    safeStr(item?.docinfo?.urlname) ||
    '';

  const fixed = rewriteDoclinkUrl(metaToDoclinkUrl(raw));
  if (!fixed) return '';

  // si on a un doclinkId, on force ".../doclinks/{id}"
  const id = safeStr(item?.doclinkId);
  if (id) {
    return fixed
      .replace(/\/doclinks\/meta\/\d+/i, `/doclinks/${id}`)
      .replace(/\/doclinks\/\d+\/meta/i, `/doclinks/${id}`);
  }

  return fixed;
}

function getDocName(item: any): string {
  let name = safeStr(item?.document);

  if (name && !name.match(/^\d+$/)) return name;

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
      return decodeURIComponent(alt);
    }
  }

  return name || 'Sans nom';
}

function getDescription(item: any): string {
  const desc = safeStr(item?.description);
  if (desc && desc.toLowerCase() !== 'aucune description') return desc;

  const desc2 = safeStr(item?.docinfo?.description);
  if (desc2 && desc2.toLowerCase() !== 'aucune description') return desc2;

  return 'Aucune description';
}

export default function DocDetailsScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { document } = route.params;

  const url = useMemo(() => getOpenUrl(document), [document]);
  const nomDocument = useMemo(() => getDocName(document), [document]);
  const description = useMemo(() => getDescription(document), [document]);

  // ✅ DIRECT: open in WebView screen (no download)
  const handleOpen = () => {
    if (!url) {
      Alert.alert('Erreur', 'Aucun lien disponible pour ce document');
      return;
    }

    // Navigate to DocViewer and pass the entire document object
    // DocViewer will rebuild url + attach auth headers + handle redirects
    navigation.navigate('DocViewer' as any, { document });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1e40af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FeatherIcon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du document</Text>
        <View style={{ width: 42 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <FeatherIcon name="file-text" size={40} color="#3b82f6" />
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {nomDocument}
          </Text>
        </View>

        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoIconWrapper}>
                <FeatherIcon name="file-text" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.infoCardTitle}>Nom de document</Text>
            </View>
            <Text style={styles.infoCardValue}>{nomDocument}</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoIconWrapper}>
                <FeatherIcon name="align-left" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.infoCardTitle}>Description</Text>
            </View>
            <Text style={styles.infoCardValue}>{description}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleOpen}
          disabled={!url}
          activeOpacity={0.85}
          style={styles.actionButton}
        >
          <LinearGradient
            colors={url ? ['#3b82f6', '#2563eb'] : ['#cbd5e1', '#94a3b8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <FeatherIcon name="external-link" size={20} color="#fff" />
            <Text style={styles.actionText}>
              {url ? 'Afficher le document' : 'Lien non disponible'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  infoCards: { gap: 14, marginBottom: 20 },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: { fontSize: 16, fontWeight: '600', color: '#0f172a', lineHeight: 24 },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  actionText: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});
