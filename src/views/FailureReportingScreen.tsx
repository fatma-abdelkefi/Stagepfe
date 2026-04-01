import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { RootStackParamList } from '../navigation/AppNavigator';
import { predictFailureWithAI } from '../services/aiFailurePredictionService';
import type { AiFailurePredictionResponse } from '../services/aiFailurePredictionService';
import { saveLocalFailureReport } from '../services/localFailureReportService';
import SuccessModal from '../components/SuccessModal';

type Props = {
  route: RouteProp<RootStackParamList, 'FailureReporting'>;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type FailureRow = {
  type: 'PROBLEM' | 'CAUSE' | 'REMEDY';
  code: string;
  description: string;
};

type PredictedFailureDetails = {
  failureClass: string;
  failureClassDescription: string;
  remarks: string;
  failureDate: string;
  remarkDate: string;
  codes: FailureRow[];
};

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateTime(d: Date): string {
  return (
    pad2(d.getDate()) +
    '/' +
    pad2(d.getMonth() + 1) +
    '/' +
    d.getFullYear() +
    ' ' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes())
  );
}

function getFailureReportCreationDate(): string {
  return formatDateTime(new Date());
}

function getFailureColor(type: string) {
  if (type === 'PROBLEM') return '#0ea5e9';
  if (type === 'CAUSE') return '#f97316';
  return '#10b981';
}

function getFailureTypeLabel(type: FailureRow['type']) {
  if (type === 'PROBLEM') return 'PROBLÈME';
  if (type === 'CAUSE') return 'CAUSE';
  return 'REMISE';
}

function translateFailureClass(code?: string | null, desc?: string | null): string {
  const c = safeTrim(code).toUpperCase();

  const map: Record<string, string> = {
    BLDGS: 'Maintenance des bâtiments et CVC',
    BUILDING: 'Maintenance des bâtiments',
    BURNERS: 'Défaillances des brûleurs',
    BOILERS: 'Défaillances des chaudières',
    PUMPS: 'Défaillances des pompes',
    PKG: 'Défaillances de ligne de conditionnement',
    PACKAGING: 'Défaillances de ligne de conditionnement',
    CONVEYORS: 'Défaillances des convoyeurs',
    HVAC: 'Chauffage, ventilation et climatisation',
  };

  return map[c] || safeTrim(desc) || c || '-';
}

function translateProblem(code?: string | null, desc?: string | null): string {
  const c = safeTrim(code).toUpperCase();

  const map: Record<string, string> = {
    LIGHTING: 'Problème d’éclairage',
    TOOCOLD: 'Trop froid',
    TOOHOT: 'Trop chaud',
    LOWPRES: 'Basse pression',
    LOWVOL: 'Faible débit',
    FLAME: 'Défaut de flamme',
    FEED: 'Problème d’alimentation',
    STOPPED: 'Équipement arrêté',
    LEAK: 'Fuite',
  };

  return map[c] || safeTrim(desc) || c || '-';
}

function translateCause(code?: string | null, desc?: string | null): string {
  const c = safeTrim(code).toUpperCase();

  const map: Record<string, string> = {
    BREAKTRP: 'Disjoncteur déclenché',
    SENSOR: 'Capteur défectueux',
    JAMPIPE: 'Tuyau bloqué',
    PILOT: 'Défaillance du pilote',
    THERM: 'Thermostat défectueux',
    FAN: 'Ventilateur défectueux',
    BELT: 'Courroie usée ou cassée',
    SHAFT: 'Arbre défectueux',
    SEAL: 'Joint défectueux',
  };

  return map[c] || safeTrim(desc) || c || '-';
}

function translateRemedy(code?: string | null, desc?: string | null): string {
  const c = safeTrim(code).toUpperCase();

  const map: Record<string, string> = {
    RESET: 'Réarmer le disjoncteur',
    ADJSENSR: 'Ajuster le capteur',
    CLRPIPE: 'Déboucher le tuyau',
    REPLACE: 'Remplacer le composant',
    CLEAN: 'Nettoyer',
    RESETBRK: 'Réarmer le disjoncteur',
  };

  return map[c] || safeTrim(desc) || c || '-';
}

function translateRemark(text?: string | null): string {
  const t = safeTrim(text);
  if (!t) return '-';

  return t
    .replace(/Observed issue:/gi, 'Problème observé :')
    .replace(/Probable cause:/gi, 'Cause probable :')
    .replace(/Action taken \/ recommended:/gi, 'Action réalisée / recommandée :')
    .replace(/Risk:/gi, 'Risque :')
    .replace(/Recommendation:/gi, 'Recommandation :');
}

function buildPredictedFailureDetails(
  ai: AiFailurePredictionResponse,
  creationDate: string,
): PredictedFailureDetails {
  const codes: FailureRow[] = [];

  if (ai.problem) {
    codes.push({
      type: 'PROBLEM',
      code: safeTrim(ai.problem),
      description: translateProblem(ai.problem, ai.problem_description),
    });
  }

  if (ai.cause) {
    codes.push({
      type: 'CAUSE',
      code: safeTrim(ai.cause),
      description: translateCause(ai.cause, ai.cause_description),
    });
  }

  if (ai.remedy) {
    codes.push({
      type: 'REMEDY',
      code: safeTrim(ai.remedy),
      description: translateRemedy(ai.remedy, ai.remedy_description),
    });
  }

  return {
    failureClass: safeTrim(ai.failure_class),
    failureClassDescription: translateFailureClass(
      ai.failure_class,
      ai.failure_class_description,
    ),
    remarks: translateRemark(ai.remarkdesc),
    failureDate: creationDate,
    remarkDate: creationDate,
    codes,
  };
}

export default function FailureReportingScreen({ route }: Props) {
  const navigation = useNavigation<NavProp>();
  const workOrder = route.params?.workOrder;

  const creationDate = useMemo(() => getFailureReportCreationDate(), []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [predicted, setPredicted] = useState<PredictedFailureDetails | null>(null);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const wonum = safeTrim(workOrder?.wonum);
  const siteid = safeTrim((workOrder as any)?.siteid);

  const buildAiPayloadFromWO = () => {
    const description = safeTrim(workOrder?.description);

    const longDescription =
      safeTrim((workOrder as any)?.description_longdescription) ||
      safeTrim((workOrder as any)?.longDescription) ||
      safeTrim((workOrder as any)?.longdescription);

    const worklog = Array.isArray((workOrder as any)?.workLogs)
      ? (workOrder as any).workLogs
          .map((w: any) =>
            safeTrim(
              w?.description ||
                w?.description_longdescription ||
                w?.longdescription ||
                w?.logtext,
            ),
          )
          .filter(Boolean)
      : Array.isArray((workOrder as any)?.worklog)
      ? (workOrder as any).worklog
          .map((w: any) =>
            safeTrim(
              w?.description ||
                w?.description_longdescription ||
                w?.longdescription ||
                w?.logtext,
            ),
          )
          .filter(Boolean)
      : [];

    const activities = Array.isArray((workOrder as any)?.activities)
      ? (workOrder as any).activities
          .map((a: any) => safeTrim(a?.description || a?.taskid || a?.wonum))
          .filter(Boolean)
      : Array.isArray((workOrder as any)?.woactivity)
      ? (workOrder as any).woactivity
          .map((a: any) => safeTrim(a?.description || a?.taskid || a?.wonum))
          .filter(Boolean)
      : [];

    const actualMaterials = Array.isArray((workOrder as any)?.actualMaterials)
      ? (workOrder as any).actualMaterials
          .map((m: any) =>
            [
              safeTrim(m?.itemnum),
              safeTrim(m?.description || m?.itemdesc),
              safeTrim(m?.quantity ?? m?.itemqty ?? m?.qty),
            ]
              .filter(Boolean)
              .join(' '),
          )
          .filter(Boolean)
      : [];

    const actualLabor = Array.isArray((workOrder as any)?.actualLabor)
      ? (workOrder as any).actualLabor
          .map((l: any) =>
            [
              safeTrim(l?.laborcode),
              safeTrim(l?.craft),
              safeTrim(l?.skilllevel),
              safeTrim(l?.regularhrs),
            ]
              .filter(Boolean)
              .join(' '),
          )
          .filter(Boolean)
      : [];

    const assetText = [
      safeTrim((workOrder as any)?.assetnum),
      safeTrim((workOrder as any)?.asset),
      safeTrim((workOrder as any)?.assetDescription),
    ]
      .filter(Boolean)
      .join(' ');

    const locationText =
      safeTrim((workOrder as any)?.location) ||
      safeTrim((workOrder as any)?.locationDescription);

    return {
      description,
      long_description: longDescription,
      worklog,
      activities,
      actual_materials: actualMaterials,
      actual_labor: actualLabor,
      assetnum: assetText,
      location: locationText,
      lang: 'fr' as const,
      debug: false,
    };
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setAiError(null);
      setPredicted(null);

      const payload = buildAiPayloadFromWO();
      const data = await predictFailureWithAI(payload);

      setPredicted(buildPredictedFailureDetails(data, creationDate));

      if (!data.failure_class && !data.problem && !data.cause && !data.remedy) {
        setAiError("L'IA n'a retourné aucune classification exploitable.");
      }
    } catch (e: any) {
      setAiError(e?.message || 'Erreur lors de la génération du failure reporting.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!predicted) {
      setAiError('Aucun signalement à enregistrer.');
      return;
    }

    try {
      setSaving(true);

      await saveLocalFailureReport(wonum, siteid, {
        failureClass: predicted.failureClass,
        failureClassDescription: predicted.failureClassDescription,
        failureDate: predicted.failureDate,
        remarkDate: predicted.remarkDate,
        remark: predicted.remarks,
        problem: predicted.codes.find(x => x.type === 'PROBLEM')?.code || '',
        problemDescription:
          predicted.codes.find(x => x.type === 'PROBLEM')?.description || '',
        cause: predicted.codes.find(x => x.type === 'CAUSE')?.code || '',
        causeDescription:
          predicted.codes.find(x => x.type === 'CAUSE')?.description || '',
        remedy: predicted.codes.find(x => x.type === 'REMEDY')?.code || '',
        remedyDescription:
          predicted.codes.find(x => x.type === 'REMEDY')?.description || '',
        codes: predicted.codes,
      });

      setSuccessVisible(true);
    } catch (e: any) {
      setAiError(e?.message || "Impossible d'enregistrer le failure reporting.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (hasLaunched || !workOrder) return;
    setHasLaunched(true);
    handleGenerate();
  }, [hasLaunched, workOrder]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Signalement de panne</Text>
          <Text style={styles.headerWO}>{'OT #' + (wonum || '-')}</Text>
        </View>

      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <FeatherIcon name="cpu" size={13} color="#6b7280" />
            <Text style={styles.cardLabel}>Génération automatique depuis le WO</Text>
          </View>

          <TouchableOpacity
            style={[styles.reloadBtn, loading && styles.disabledBtn]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <FeatherIcon name="refresh-cw" size={15} color="#fff" />
            )}
            <Text style={styles.reloadBtnText}>
              {loading ? 'Génération...' : 'Relancer génération IA'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingTitle}>Analyse en cours</Text>
          </View>
        )}

        {!!aiError && !loading && (
          <View style={styles.card}>
            <Text style={styles.errorText}>{aiError}</Text>
          </View>
        )}

        {!!predicted && !loading && (
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <FeatherIcon name="database" size={13} color="#6b7280" />
              <Text style={styles.cardLabel}>Détails de la panne</Text>
            </View>

            <Text style={styles.inputLabel}>Classe de panne</Text>
            <Text style={styles.readonlyValue}>
              {(predicted.failureClass || '-') +
                '  ' +
                (predicted.failureClassDescription || '')}
            </Text>

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Remarques</Text>
            <Text style={styles.readonlyValueMultiline}>{predicted.remarks || '-'}</Text>

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Codes de panne</Text>

            {!predicted.codes.length ? (
              <Text style={styles.classPlaceholder}>Aucun code prédit</Text>
            ) : (
              predicted.codes.map((row, index) => (
                <View key={row.type + '-' + row.code + '-' + index} style={styles.tableRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: getFailureColor(row.type) + '18' },
                    ]}
                  >
                    <Text style={[styles.typeBadgeText, { color: getFailureColor(row.type) }]}>
                      {getFailureTypeLabel(row.type)}
                    </Text>
                  </View>

                  <Text style={styles.tableCellStrong}>{row.code}</Text>
                  <Text style={styles.tableCell}>{row.description || '-'}</Text>
                </View>
              ))
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.disabledBtn]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FeatherIcon name="save" size={16} color="#fff" />
              )}
              <Text style={styles.saveBtnText}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <SuccessModal
        visible={successVisible}
        title="Succès"
        message="Failure reporting enregistré avec succès."
        onClose={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  headerBar: {
    backgroundColor: '#1652d1',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  headerWO: { marginTop: 2, fontSize: 12, color: '#ffffff', fontWeight: '500' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#1652d1',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#162df9',
    marginLeft: 5,
  },
  container: { backgroundColor: '#f1f5f9', padding: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    marginBottom: 10,
  },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  reloadBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1652d1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reloadBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  saveBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1652d1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 8 },
  disabledBtn: { opacity: 0.5 },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 10 },
  errorText: { color: '#ef6c44', fontSize: 13, fontWeight: '600' },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  readonlyValue: {
    minHeight: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    fontSize: 14,
    color: '#0f172a',
    paddingBottom: 2,
  },
  readonlyValueMultiline: {
    minHeight: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    fontSize: 14,
    color: '#0f172a',
    paddingBottom: 2,
  },
  tableRow: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
  },
  tableCell: { fontSize: 13, color: '#0f172a', marginTop: 4 },
  tableCellStrong: { fontSize: 13, color: '#0f172a', fontWeight: '700', marginTop: 6 },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  classPlaceholder: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 8,
  },
});