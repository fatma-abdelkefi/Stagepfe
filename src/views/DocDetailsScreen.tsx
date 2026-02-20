// src/views/DocDetailsScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';

import { RootStackParamList } from '../navigation/AppNavigator';

// ✅ ton thème centralisé
import { Colors, Spacing, Radius, Gradients } from '../ui/theme';
import { AppIcon } from '../ui/AppIcon';
import { AppText } from '../ui/AppText';

type Props = {
  route: RouteProp<RootStackParamList, 'DocDetails'>;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DocDetails'>;

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * ✅ récupère un lien “ouvrable”
 * On prend href/urlname et on le “normalise” un minimum.
 * (DocViewer va gérer headers/auth si tu l’as déjà fait comme tu disais)
 */
function buildOpenUrl(item: any): string {
  const raw =
    safeStr(item?.href) ||
    safeStr(item?.docinfo?.href) ||
    safeStr(item?.urlname) ||
    safeStr(item?.docinfo?.urlname) ||
    '';

  if (!raw) return '';

  // ✅ si déjà un http(s)
  if (/^https?:\/\//i.test(raw)) return raw;

  // ✅ parfois c’est juste "/maximo/oslc/...."
  if (raw.startsWith('/')) return raw;

  // ✅ fallback: retourner tel quel (DocViewer peut compléter)
  return raw;
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
      try {
        return decodeURIComponent(alt);
      } catch {
        return alt;
      }
    }
  }

  return name || 'Sans nom';
}

function getDescription(item: any): string {
  const d1 = safeStr(item?.description);
  if (d1 && d1.toLowerCase() !== 'aucune description') return d1;

  const d2 = safeStr(item?.docinfo?.description);
  if (d2 && d2.toLowerCase() !== 'aucune description') return d2;

  return 'Aucune description';
}

export default function DocDetailsScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { document } = route.params;

  const url = useMemo(() => buildOpenUrl(document), [document]);
  const nomDocument = useMemo(() => getDocName(document), [document]);
  const description = useMemo(() => getDescription(document), [document]);

  const headerColors = useMemo(
    () => [...Gradients.header] as unknown as (string | number)[],
    []
  );

  const actionColors = useMemo(
    () =>
      (url
        ? [...Gradients.action]
        : [Colors.placeholder, Colors.emptyGray]) as unknown as (string | number)[],
    [url]
  );

  const handleOpen = () => {
    if (!url) {
      Alert.alert('Erreur', 'Aucun lien disponible pour ce document');
      return;
    }

    // ✅ tu avais déjà DocViewer: on lui passe le document complet
    navigation.navigate('DocViewer', { document });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.9}>
          <AppIcon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <AppText style={styles.headerTitle}>Détails du document</AppText>

        <View style={{ width: 42 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <AppIcon name="file-text" size={40} color={Colors.primary} />
          </View>

          <AppText style={styles.heroTitle} numberOfLines={2}>
            {nomDocument}
          </AppText>
        </View>

        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoIconWrapper}>
                <AppIcon name="file-text" size={18} color={Colors.primary} />
              </View>
              <AppText style={styles.infoCardTitle}>Nom de document</AppText>
            </View>
            <AppText style={styles.infoCardValue}>{nomDocument}</AppText>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoIconWrapper}>
                <AppIcon name="align-left" size={18} color={Colors.primary} />
              </View>
              <AppText style={styles.infoCardTitle}>Description</AppText>
            </View>
            <AppText style={styles.infoCardValue}>{description}</AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleOpen}
          disabled={!url}
          activeOpacity={0.85}
          style={[styles.actionButton, !url && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={actionColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <AppIcon name="external-link" size={20} color="#fff" />
            <AppText style={styles.actionText}>
              {url ? 'Afficher le document' : 'Lien non disponible'}
            </AppText>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.docBg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: Radius.docHeader,
    borderBottomRightRadius: Radius.docHeader,
    shadowColor: Colors.primary,
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
  contentContainer: { padding: Spacing.xl, paddingBottom: 40 },

  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
    backgroundColor: Colors.softBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },

  infoCards: { gap: 14, marginBottom: 20 },

  infoCard: {
    backgroundColor: Colors.card,
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
    backgroundColor: Colors.softBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoCardValue: { fontSize: 16, fontWeight: '600', color: Colors.text, lineHeight: 24 },

  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
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
