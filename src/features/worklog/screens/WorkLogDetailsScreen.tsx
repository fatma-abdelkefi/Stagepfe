import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../../app/navigation/types';
import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import { formatDateTime, extractLongText } from '../utils/worklogFormatters';

type Props = {
  route: RouteProp<RootStackParamList, 'WorkLogDetails'>;
};

const C = {
  background: '#0b1020',
  surface: '#111520',
  surfaceAlt: '#181c27',
  surfaceRaised: '#1c2133',
  border: '#1e2235',
  borderAlt: '#252938',

  accent: '#3d6aff',
  accentSoft: 'rgba(61,106,255,0.10)',
  accentMid: 'rgba(61,106,255,0.18)',

  text: '#f8fafc',
  textSub: '#8b92b0',
  textMuted: '#4f566b',

  divider: '#1a1f30',
};

export default function WorkLogDetailsScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { title, wonum, item } = route.params;
  const [fullItem, setFullItem] = useState<any>(item || null);

  useEffect(() => {
    setFullItem(item || null);
  }, [item]);

  const description = String(fullItem?.description || '').trim();

  const detailsText = useMemo(() => {
    return (
      extractLongText(fullItem) ||
      fullItem?.description_longdescription ||
      fullItem?.description ||
      'Aucun détail disponible.'
    );
  }, [fullItem]);

  const typeText =
    fullItem?.logtype_description || fullItem?.logtype || 'Type non défini';
  const createdBy = fullItem?.createby || 'Non défini';
  const createdDate = formatDateTime(fullItem?.createdate) || 'Non définie';

  return (
    <ListDetailsLayout
      title={title || 'Détail Work Log'}
      subtitle={`OT #${wonum || '-'}`}
      onBack={() => navigation.goBack()}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          {/* Accent stripe */}
          <View style={styles.heroStripe} />

          <View style={styles.heroInner}>
            <View style={styles.heroIconWrap}>
              <FeatherIcon name="message-square" size={22} color={C.accent} />
            </View>

            <View style={styles.heroBody}>
              <Text style={styles.eyebrow}>Work Log</Text>
              <Text style={styles.heroTitle} numberOfLines={3}>
                {description || 'Aucune description'}
              </Text>
            </View>
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.pill}>
              <FeatherIcon name="tag" size={11} color={C.accent} />
              <Text style={styles.pillText}>{typeText}</Text>
            </View>
            <Text style={styles.heroWonum}></Text>
          </View>
        </View>

        {/* ── Meta section ── */}
        <View style={styles.section}>
          <SectionLabel icon="info" label="Informations" />
          <View style={styles.metaGrid}>
            <MetaTile icon="user" label="Créé par" value={createdBy} />
            <MetaTile icon="calendar" label="Date" value={createdDate} />
          </View>
          <MetaRow icon="align-left" label="Résumé" value={description || 'Aucune description'} />
        </View>

        {/* ── Details section ── */}
        <View style={styles.section}>
          <SectionLabel icon="file-text" label="Détails" />
          <View style={styles.detailsBox}>
            <Text style={styles.detailsText}>{detailsText}</Text>
          </View>
        </View>
      </ScrollView>
    </ListDetailsLayout>
  );
}

/* ────────── Sub-components ────────── */

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionDot} />
      <FeatherIcon name={icon as any} size={13} color={C.accent} style={{ marginRight: 6 }} />
      <Text style={styles.sectionLabelText}>{label}</Text>
    </View>
  );
}

function MetaTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.metaTile}>
      <View style={styles.metaTileIcon}>
        <FeatherIcon name={icon as any} size={14} color={C.accent} />
      </View>
      <Text style={styles.metaTileLabel}>{label}</Text>
      <Text style={styles.metaTileValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function MetaRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaRowLeft}>
        <View style={styles.metaRowIcon}>
          <FeatherIcon name={icon as any} size={13} color={C.accent} />
        </View>
        <Text style={styles.metaRowLabel}>{label}</Text>
      </View>
      <Text style={styles.metaRowValue}>{value}</Text>
    </View>
  );
}

/* ────────── Styles ────────── */

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },

  /* Hero */
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  heroStripe: {
    height: 3,
    backgroundColor: C.accent,
    borderRadius: 0,
    opacity: 0.85,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.accentMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(61,106,255,0.22)',
  },
  heroBody: {
    flex: 1,
    paddingTop: 2,
  },
  eyebrow: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  heroTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    backgroundColor: C.surfaceAlt,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(61,106,255,0.15)',
  },
  pillText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroWonum: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Section wrapper */
  section: {
    gap: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: C.accent,
    marginRight: 8,
  },
  sectionLabelText: {
    color: C.textSub,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* Meta 2-column grid */
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metaTile: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 6,
  },
  metaTileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(61,106,255,0.12)',
  },
  metaTileLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaTileValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  /* Meta full-width row */
  metaRow: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 8,
  },
  metaRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRowIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRowLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaRowValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    paddingLeft: 34,
  },

  /* Details box */
  detailsBox: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderAlt,
    padding: 16,
  },
  detailsText: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 22,
  },
});
