import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import { colors } from '../../../shared/theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkOrderDetails'>;

const UI = {
  bg: '#080c14',
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  text: '#f8fafc',
  sub: '#9ca3b8',
};

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value !== undefined && value !== null && value !== '' ? value : '—'}</Text>
    </View>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <FeatherIcon name={icon as any} size={17} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {children}
    </View>
  );
}

export default function WorkOrderDetailsDraftScreen({ route, navigation }: Props) {
  const workorder = route.params?.draftWorkOrder;

  if (!workorder) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucun Work Order à afficher.</Text>
      </View>
    );
  }

  const activities = workorder.activities || [];
  const materials = workorder.planned_materials || [];
  const labor = workorder.planned_labor || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.85}
        >
          <FeatherIcon name="arrow-left" size={24} color={UI.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Détails Work Order</Text>
          <Text style={styles.subtitle}>Work Order ajouté localement</Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{workorder.status || 'WAPPR'}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Section icon="clipboard" title="Informations principales">
          <Field label="WO" value={workorder.wonum || route.params?.wonum} />
          <Field label="Description" value={workorder.description} />
          <Field label="Description longue" value={workorder.long_description} />
        </Section>

        <Section icon="cpu" title="Équipement et emplacement">
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field label="Équipement" value={workorder.assetnum} />
            </View>
            <View style={styles.rowItem}>
              <Field label="Emplacement" value={workorder.location} />
            </View>
          </View>

          <Field label="Description équipement" value={workorder.asset_description} />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field label="Site" value={workorder.siteid} />
            </View>
            <View style={styles.rowItem}>
              <Field label="Signalé par" value={workorder.reportedby} />
            </View>
          </View>
        </Section>

        <Section icon="calendar" title="Planification">
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field label="Type" value={workorder.worktype} />
            </View>
            <View style={styles.rowItem}>
              <Field label="Priorité" value={workorder.priority} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field label="Début planifié" value={workorder.scheduled_start} />
            </View>
            <View style={styles.rowItem}>
              <Field label="Fin planifiée" value={workorder.scheduled_finish} />
            </View>
          </View>
        </Section>

        <Section icon="list" title="Activités planifiées">
          {activities.length === 0 ? (
            <Text style={styles.emptySectionText}>Aucune activité planifiée.</Text>
          ) : (
            activities.map((activity: any, index: number) => (
              <View key={`activity-${index}`} style={styles.itemCard}>
                <Text style={styles.itemTitle}>Activité {index + 1}</Text>
                <Field label="Description" value={activity.description} />

                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field label="Task ID" value={activity.taskid} />
                  </View>
                  <View style={styles.rowItem}>
                    <Field label="Statut" value={activity.status || 'WAPPR'} />
                  </View>
                </View>
              </View>
            ))
          )}
        </Section>

        <Section icon="box" title="Matériels planifiés">
          {materials.length === 0 ? (
            <Text style={styles.emptySectionText}>Aucun matériel planifié.</Text>
          ) : (
            materials.map((material: any, index: number) => (
              <View key={`material-${index}`} style={styles.itemCard}>
                <Text style={styles.itemTitle}>Matériel {index + 1}</Text>

                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field label="Article" value={material.itemnum} />
                  </View>
                  <View style={styles.rowItem}>
                    <Field label="Magasin" value={material.location} />
                  </View>
                </View>

                <Field label="Description" value={material.description} />
                <Field label="Quantité" value={material.quantity} />
              </View>
            ))
          )}
        </Section>

        <Section icon="users" title="Main-d’œuvre planifiée">
          {labor.length === 0 ? (
            <Text style={styles.emptySectionText}>Aucune main-d’œuvre planifiée.</Text>
          ) : (
            labor.map((item: any, index: number) => (
              <View key={`labor-${index}`} style={styles.itemCard}>
                <Text style={styles.itemTitle}>Main-d’œuvre {index + 1}</Text>

                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field label="Labor code" value={item.laborcode} />
                  </View>
                  <View style={styles.rowItem}>
                    <Field label="Heures" value={item.laborhrs} />
                  </View>
                </View>

                <Field label="Quantité" value={item.quantity} />
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 42,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: UI.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.borderAlt,
  },

  headerTextWrap: {
    flex: 1,
  },

  title: {
    color: UI.text,
    fontSize: 20,
    fontWeight: '900',
  },

  subtitle: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(59,130,246,0.12)',
  },

  statusText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },

  section: {
    backgroundColor: UI.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#12214a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },

  field: {
    marginBottom: 10,
  },

  label: {
    color: UI.sub,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },

  value: {
    color: UI.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  rowItem: {
    flex: 1,
  },

  itemCard: {
    backgroundColor: UI.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.borderAlt,
    padding: 12,
    marginBottom: 10,
  },

  itemTitle: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },

  emptySectionText: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: '600',
  },

  empty: {
    flex: 1,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  emptyText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
  },
});