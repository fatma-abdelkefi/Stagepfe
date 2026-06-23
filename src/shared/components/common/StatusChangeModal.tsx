import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  changeActivityStatus,
  changeStatusByHref,
  DEFAULT_ACTIVITY_DOMAIN_ID,
  getActivityStatusListFR,
  getFrenchStatusLabel,
  getWorkOrderStatusListFR,
  normalizeMaximoHref,
  type StatusFR,
} from '../../services/statusService';

type EntityType = 'WO' | 'ACTIVITY';

type ActivityCtx = {
  taskid?: string;
  wonum?: string;
  siteid?: string;
  workorderid?: string;
  href?: string;
};

type Props = {
  visible: boolean;
  entityType: EntityType;
  currentStatus?: string;
  href?: string;
  wonum?: string;
  siteid?: string;
  username: string;
  password: string;
  locked?: boolean;
  activityDomainId?: string;
  activityCtx?: ActivityCtx;
  onClose: () => void;
  onSuccess?: (payload: { code: string; label: string }) => void;
};

function getStatusCode(item: any): string {
  return String(item?.code ?? item?.maxvalue ?? item?.value ?? '')
    .trim()
    .toUpperCase();
}

function getStatusText(item: any): string {
  return String(
    item?.libelle ??
      item?.description ??
      item?.desc ??
      item?.value ??
      item?.maxvalue ??
      item?.code ??
      '',
  ).trim();
}

function normalizeStatusLabelFR(code: string, text: string): string {
  const value = String(text || code || '').trim().toUpperCase();

  const translations: Record<string, string> = {
    // Work Order
    WAPPR: 'En attente d’approbation',
    APPR: 'Approuvé',
    WSCH: 'En attente de planification',
    WMATL: 'En attente de matériel',
    WPMATL: 'En attente de matériel',
    WPCOND: 'En attente de condition',
    HISTEDIT: 'Historique modifié',
    INPRG: 'En cours',
    COMP: 'Terminé',
    CLOSE: 'Clôturé',
    CAN: 'Annulé',

    // Activity / Task
    PNDREV: 'En attente de révision',
    STARTED: 'Démarré',
    FINISHED: 'Terminé',

    // Textes anglais possibles
    'WAITING ON APPROVAL': 'En attente d’approbation',
    APPROVED: 'Approuvé',
    'WAITING TO BE SCHEDULED': 'En attente de planification',
    'WAITING FOR MATERIAL': 'En attente de matériel',
    'WAITING FOR PLANT CONDITION': 'En attente de condition',
    'HISTORY EDIT': 'Historique modifié',
    'HISTORICAL EDIT': 'Historique modifié',
    'IN PROGRESS': 'En cours',
    COMPLETED: 'Terminé',
    CLOSED: 'Clôturé',
    CANCELED: 'Annulé',
    CANCELLED: 'Annulé',
  };

  return translations[value] || getFrenchStatusLabel(code) || text || code;
}

export default function StatusChangeModal({
  visible,
  entityType,
  currentStatus,
  href,
  wonum,
  siteid,
  username,
  password,
  locked = false,
  activityDomainId = DEFAULT_ACTIVITY_DOMAIN_ID,
  activityCtx,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statuses, setStatuses] = useState<StatusFR[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [error, setError] = useState<string>('');

  const currentCode = useMemo(
    () => String(currentStatus ?? '').trim().toUpperCase(),
    [currentStatus],
  );

  const rawHref = useMemo(() => String(href ?? '').trim(), [href]);
  const hrefClean = useMemo(() => normalizeMaximoHref(rawHref), [rawHref]);

  useEffect(() => {
    if (!visible) return;

    console.log('[MODAL][STATUS] open', {
      entityType,
      currentStatus: currentCode,
      locked,
      wonum,
      siteid,
      href: rawHref,
      hrefClean,
      activityCtx,
    });

    setSelectedCode(currentCode);
    setError('');

    if (locked) {
      setStatuses([]);
      return;
    }

    if (!username || !password) {
      setStatuses([]);
      setError('Identifiants manquants');
      return;
    }

    let cancelled = false;

    async function loadStatuses() {
      try {
        setLoading(true);
        setError('');

        const list =
          entityType === 'ACTIVITY'
            ? await getActivityStatusListFR(username, password, activityDomainId)
            : await getWorkOrderStatusListFR(username, password);

        if (!cancelled) {
          setStatuses(Array.isArray(list) ? list : []);
        }
      } catch (e: any) {
        console.log('[MODAL][STATUS] load error=', e?.message || e);
        if (!cancelled) {
          setStatuses([]);
          setError(e?.message || 'Impossible de charger la liste des statuts');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStatuses();

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    entityType,
    currentCode,
    locked,
    username,
    password,
    activityDomainId,
    wonum,
    siteid,
    rawHref,
    hrefClean,
    activityCtx,
  ]);

  function closeAndReset() {
    setError('');
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit() {
    try {
      if (locked) {
        closeAndReset();
        return;
      }

      const nextStatus = String(selectedCode ?? '').trim().toUpperCase();

      if (!nextStatus) {
        Alert.alert('Erreur', 'Veuillez sélectionner un statut');
        return;
      }

      if (!username || !password) {
        Alert.alert('Erreur', 'Identifiants manquants');
        return;
      }

      setSubmitting(true);
      setError('');

      console.log('[STATUS SUBMIT]', {
        entityType,
        rawHref,
        hrefClean,
        currentCode,
        selectedCode: nextStatus,
        wonum,
        siteid,
        activityCtx,
      });

      if (entityType === 'ACTIVITY') {
        const taskid = String(activityCtx?.taskid ?? '').trim();
        const awonum = String(activityCtx?.wonum ?? '').trim();
        const asiteid = String(activityCtx?.siteid ?? '').trim();
        const aworkorderid = String(activityCtx?.workorderid ?? '').trim();

        if (!taskid) {
          throw new Error("taskid manquant pour le changement de statut d'activité");
        }
        if (!awonum) {
          throw new Error("wonum manquant pour le changement de statut d'activité");
        }
        if (!asiteid) {
          throw new Error("siteid manquant pour le changement de statut d'activité");
        }

        await changeActivityStatus(
          {
            taskid,
            wonum: awonum,
            siteid: asiteid,
            workorderid: aworkorderid,
            href: rawHref,
          },
          nextStatus,
          username,
          password,
          { memo: 'Changement via mobile' },
        );
      } else {
        const whref = String(hrefClean ?? '').trim();

        if (!whref) {
          throw new Error("href manquant pour le changement de statut de l'ordre de travail");
        }

        await changeStatusByHref(
          whref,
          nextStatus,
          username,
          password,
          { memo: 'Changement via mobile' },
        );
      }

      const label = getFrenchStatusLabel(nextStatus) || nextStatus;
      onSuccess?.({ code: nextStatus, label });
      closeAndReset();
    } catch (e: any) {
      const message = e?.message || 'Erreur lors du changement de statut';
      console.log('[MODAL][STATUS] change error=', message);
      setError(message);
      Alert.alert('Erreur', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeAndReset}
    >
      <Pressable style={styles.overlay} onPress={closeAndReset}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {entityType === 'ACTIVITY'
                ? "Changer le statut de l'activité"
                : "Changer le statut de l'ordre de travail"}
            </Text>
            <Text style={styles.subtitle}>
              Statut actuel : {getFrenchStatusLabel(currentCode) || currentCode || '-'}
            </Text>
          </View>

          {locked ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedText}>
                Cet élément est clôturé. Le statut ne peut plus être modifié.
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" />
              <Text style={styles.loaderText}>Chargement des statuts...</Text>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {statuses.map((item: any, index: number) => {
                  const code = getStatusCode(item);
                  const rawText = getStatusText(item);

                  const fixedLabels: Record<string, string> = {
                    HISTEDIT: 'Historique modifié',
                    WPCOND: 'En attente de condition',
                    WPMATL: 'En attente de matériel',
                    WMATL: 'En attente de matériel',
                  };

                  const label =
                    fixedLabels[code] ||
                    normalizeStatusLabelFR(code, rawText) ||
                    `Statut ${index + 1}`;

                  const selected = code === selectedCode;

                  return (
                    <TouchableOpacity
                      key={`${code}-${index}`}
                      style={[
                        styles.option,
                        selected && styles.optionSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedCode(code)}
                    >
                      <View style={styles.optionLeft}>
                        <View
                          style={[
                            styles.radio,
                            selected && styles.radioSelected,
                          ]}
                        />
                        <View>
                          <Text
                            style={[
                              styles.optionTitle,
                              selected && styles.optionTitleSelected,
                            ]}
                          >
                            {label}
                          </Text>
                          <Text style={styles.optionCode}>{code}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {!loading && statuses.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>Aucun statut disponible</Text>
                  </View>
                ) : null}
              </ScrollView>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.85}
              onPress={closeAndReset}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (submitting || locked) && styles.submitButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={submitting || locked}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Confirmer</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  loaderBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#475569',
    fontSize: 14,
  },
  lockedBox: {
    margin: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
  },
  lockedText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  option: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  radioSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  optionTitleSelected: {
    color: '#1D4ED8',
  },
  optionCode: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancelText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 15,
  },
  submitButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});