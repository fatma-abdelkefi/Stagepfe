import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../../app/navigation/types';
import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import { formatDateTime, extractLongText } from '../utils/worklogFormatters';

type Props = {
  route: RouteProp<RootStackParamList, 'WorkLogDetails'>;
};

export default function WorkLogDetailsScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { title, wonum, item } = route.params;

  const [fullItem, setFullItem] = useState<any>(item || null);

  useEffect(() => {
    console.log('[DETAIL] item:', item);
    setFullItem(item || null);
  }, [item]);

  const detailsText = useMemo(() => {
    return (
      extractLongText(fullItem) ||
      fullItem?.description ||
      'Aucun détail disponible.'
    );
  }, [fullItem]);

  return (
    <ListDetailsLayout
      title={title}
      subtitle={`OT #${wonum || '-'}`}
      onBack={() => navigation.goBack()}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBox}>
          <View style={styles.iconBox}>
            <FeatherIcon name="message-square" size={30} color="#3d6aff" />
          </View>

          <Text style={styles.mainTitle}>
            {fullItem?.description || 'Worklog'}
          </Text>

          <Text style={styles.mainSubtitle}>
            {fullItem?.logtype_description || fullItem?.logtype || 'Type non défini'}
          </Text>
        </View>

        <View style={styles.section}>
          <InfoRow
            icon="tag"
            label="Type"
            value={fullItem?.logtype_description || fullItem?.logtype || 'Non défini'}
          />

          <InfoRow
            icon="user"
            label="Créé par"
            value={fullItem?.createby || 'Non défini'}
          />

          <InfoRow
            icon="calendar"
            label="Date"
            value={formatDateTime(fullItem?.createdate) || 'Non définie'}
          />

          <InfoRow
            icon="align-left"
            label="Description"
            value={fullItem?.description || 'Aucune description'}
          />

          <InfoRow
            icon="file-text"
            label="Détails"
            value={detailsText}
            last
          />
        </View>
      </ScrollView>
    </ListDetailsLayout>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <View style={styles.rowHeader}>
        <View style={styles.smallIconBox}>
          <FeatherIcon name={icon as any} size={15} color="#3d6aff" />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>

      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  headerBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: 'rgba(61,106,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  mainSubtitle: {
    marginTop: 4,
    color: '#8b92b0',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#111520',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e2235',
  },
  infoRow: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2235',
  },
  infoRowLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallIconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(61,106,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  label: {
    color: '#8b92b0',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
});