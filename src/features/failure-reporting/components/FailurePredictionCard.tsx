import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Card from '../../../shared/components/layout/Card';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import type {
  FailureCodeRow,
  PredictedFailureDetails,
} from '../types/failureReporting.types';
import { safeTrim } from '../utils/failureFormatters';
import {
  getMaximoFailureHierarchyOptions,
  MaximoFailureOption,
  MaximoFailureOptionLevel,
} from '../services/failureMaximoHierarchyOptionsService';

type Props = {
  loading: boolean;
  saving: boolean;
  error?: string | null;
  predicted: PredictedFailureDetails | null;

  siteid?: string;
  editable?: boolean;
  onChangePredicted?: (next: PredictedFailureDetails) => void;
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  text: '#ffffff',
  textBlue: '#3d6aff',
  textMuted: '#8d95b8',
  danger: '#ef4444',
  overlay: 'rgba(0,0,0,0.65)',
};

function emptyCode(type: FailureCodeRow['type']): FailureCodeRow {
  return {
    type,
    code: '',
    description: '',
  };
}

function getCode(
  predicted: PredictedFailureDetails | null,
  type: FailureCodeRow['type'],
): FailureCodeRow {
  return predicted?.codes.find(row => row.type === type) || emptyCode(type);
}

function normalizeOption(option: MaximoFailureOption): MaximoFailureOption {
  return {
    code: safeTrim(option.code).toUpperCase(),
    description: safeTrim(option.description),
  };
}

function updateFailureClass(
  predicted: PredictedFailureDetails,
  option: MaximoFailureOption,
): PredictedFailureDetails {
  const next = normalizeOption(option);

  return {
    ...predicted,
    failureClass: next.code,
    failureClassDescription: next.description || '',
    codes: [emptyCode('PROBLEM'), emptyCode('CAUSE'), emptyCode('REMEDY')],
  };
}

function updateProblem(
  predicted: PredictedFailureDetails,
  option: MaximoFailureOption,
): PredictedFailureDetails {
  const next = normalizeOption(option);

  return {
    ...predicted,
    codes: [
      {
        type: 'PROBLEM',
        code: next.code,
        description: next.description || '',
      },
      emptyCode('CAUSE'),
      emptyCode('REMEDY'),
    ],
  };
}

function updateCause(
  predicted: PredictedFailureDetails,
  option: MaximoFailureOption,
): PredictedFailureDetails {
  const next = normalizeOption(option);
  const problem = getCode(predicted, 'PROBLEM');

  return {
    ...predicted,
    codes: [
      problem,
      {
        type: 'CAUSE',
        code: next.code,
        description: next.description || '',
      },
      emptyCode('REMEDY'),
    ],
  };
}

function updateRemedy(
  predicted: PredictedFailureDetails,
  option: MaximoFailureOption,
): PredictedFailureDetails {
  const next = normalizeOption(option);
  const problem = getCode(predicted, 'PROBLEM');
  const cause = getCode(predicted, 'CAUSE');

  return {
    ...predicted,
    codes: [
      problem,
      cause,
      {
        type: 'REMEDY',
        code: next.code,
        description: next.description || '',
      },
    ],
  };
}

function SelectField({
  label,
  value,
  description,
  editable,
  onPress,
}: {
  label: string;
  value?: string;
  description?: string;
  editable?: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        activeOpacity={editable ? 0.75 : 1}
        onPress={editable ? onPress : undefined}
        style={[styles.valueBox, editable && styles.selectBox]}
      >
        <Text style={styles.valueText}>{safeTrim(value) || 'Choisir...'}</Text>

        {description ? (
          <Text style={styles.descriptionText}>{description}</Text>
        ) : null}

        {editable ? (
          <Text style={styles.selectHint}>Appuyer pour choisir</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

function TextAreaField({
  label,
  value,
  editable,
  onChangeText,
}: {
  label: string;
  value?: string;
  editable?: boolean;
  onChangeText?: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      {editable ? (
        <TextInput
          value={value || ''}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor={C.textMuted}
          style={[styles.input, styles.inputMultiline]}
          multiline
        />
      ) : (
        <View style={styles.valueBox}>
          <Text style={styles.valueText}>{safeTrim(value) || '—'}</Text>
        </View>
      )}
    </View>
  );
}

export default function FailurePredictionCard({
  loading,
  saving,
  predicted,
  siteid,
  editable = false,
  onChangePredicted,
}: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState('');
  const [pickerLevel, setPickerLevel] =
    useState<MaximoFailureOptionLevel | null>(null);
  const [pickerOptions, setPickerOptions] = useState<MaximoFailureOption[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const problem = getCode(predicted, 'PROBLEM');
  const cause = getCode(predicted, 'CAUSE');
  const remedy = getCode(predicted, 'REMEDY');

  function applyChange(next: PredictedFailureDetails) {
    onChangePredicted?.(next);
  }

  function getTitle(level: MaximoFailureOptionLevel): string {
    if (level === 'failure_class') return 'Choisir la classe de panne';
    if (level === 'problem') return 'Choisir le problème';
    if (level === 'cause') return 'Choisir la cause';
    return 'Choisir le remède';
  }

  async function openPicker(level: MaximoFailureOptionLevel) {
    if (!predicted) return;

    setPickerLevel(level);
    setPickerTitle(getTitle(level));
    setPickerVisible(true);
    setPickerError(null);
    setPickerOptions([]);

    if (level === 'problem' && !safeTrim(predicted.failureClass)) {
      setPickerError('Choisissez d’abord la classe de panne.');
      return;
    }

    if (
      level === 'cause' &&
      (!safeTrim(predicted.failureClass) || !safeTrim(problem.code))
    ) {
      setPickerError('Choisissez d’abord la classe de panne et le problème.');
      return;
    }

    if (
      level === 'remedy' &&
      (!safeTrim(predicted.failureClass) ||
        !safeTrim(problem.code) ||
        !safeTrim(cause.code))
    ) {
      setPickerError(
        'Choisissez d’abord la classe de panne, le problème et la cause.',
      );
      return;
    }

    try {
      setPickerLoading(true);

      const options = await getMaximoFailureHierarchyOptions({
        level,
        failure_class: predicted.failureClass,
        problem: problem.code,
        cause: cause.code,
        siteid,
      });

      setPickerOptions(options);
    } catch (e: any) {
      setPickerError(e?.message || 'Impossible de charger les choix.');
    } finally {
      setPickerLoading(false);
    }
  }

  function chooseOption(option: MaximoFailureOption) {
    if (!predicted || !pickerLevel) return;

    if (pickerLevel === 'failure_class') {
      applyChange(updateFailureClass(predicted, option));
    }

    if (pickerLevel === 'problem') {
      applyChange(updateProblem(predicted, option));
    }

    if (pickerLevel === 'cause') {
      applyChange(updateCause(predicted, option));
    }

    if (pickerLevel === 'remedy') {
      applyChange(updateRemedy(predicted, option));
    }

    setPickerVisible(false);
  }

  return (
    <Card style={styles.card}>
      <SectionLabel icon="database" title="Signalement de panne proposé" />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.helperText}>Analyse de la panne en cours...</Text>
        </View>
      ) : predicted ? (
        <>
          <SelectField
            label="Classe de panne"
            value={predicted.failureClass}
            description={predicted.failureClassDescription}
            editable={editable}
            onPress={() => openPicker('failure_class')}
          />

          <SelectField
            label="Problème"
            value={problem.code}
            description={problem.description}
            editable={editable}
            onPress={() => openPicker('problem')}
          />

          <SelectField
            label="Cause"
            value={cause.code}
            description={cause.description}
            editable={editable}
            onPress={() => openPicker('cause')}
          />

          <SelectField
            label="Remède"
            value={remedy.code}
            description={remedy.description}
            editable={editable}
            onPress={() => openPicker('remedy')}
          />

          <TextAreaField
            label="Remarque"
            value={predicted.remarks}
            editable={editable}
            onChangeText={value =>
              applyChange({
                ...predicted,
                remarks: value,
              })
            }
          />

          <Text style={styles.noteText}>
            Vérifiez ou corrigez les codes avant l’enregistrement dans Maximo.
          </Text>
        </>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.helperText}>
            Aucun signalement de panne proposé.
          </Text>
        </View>
      )}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>

            {pickerLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={styles.helperText}>Chargement des choix...</Text>
              </View>
            ) : pickerError ? (
              <Text style={styles.errorText}>{pickerError}</Text>
            ) : pickerOptions.length === 0 ? (
              <Text style={styles.helperText}>Aucun choix disponible.</Text>
            ) : (
              <FlatList
                data={pickerOptions}
                keyExtractor={item => item.code}
                style={styles.optionsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => chooseOption(item)}
                  >
                    <Text style={styles.optionCode}>{item.code}</Text>
                    {item.description ? (
                      <Text style={styles.optionDescription}>
                        {item.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  centerBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 16,
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '600',
    lineHeight: 20,
  },
  field: {
    marginTop: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textMuted,
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  valueBox: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectBox: {
    borderColor: C.accent,
  },
  valueText: {
    color: C.textBlue,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  descriptionText: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  selectHint: {
    marginTop: 4,
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 44,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  noteText: {
    marginTop: 14,
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  modalTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },
  modalCenter: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  optionsList: {
    maxHeight: 420,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    marginBottom: 8,
  },
  optionCode: {
    color: C.textBlue,
    fontSize: 15,
    fontWeight: '900',
  },
  optionDescription: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  closeButton: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
  },
  closeButtonText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
  },
});