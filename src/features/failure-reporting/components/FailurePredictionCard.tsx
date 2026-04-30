import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Card from '../../../shared/components/layout/Card';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import { colors } from '../../../shared/theme/colors';
import type { PredictedFailureDetails } from '../types/failureReporting.types';
import FailureCodesList from './FailureCodesList';

type Props = {
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  predicted: PredictedFailureDetails | null;
  onGenerate: () => void;
  onSave: () => void;
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: colors.primary,
  pill: 'rgba(59,130,246,0.12)',
  text: '#f8fafc',
  textSub: '#8b92b0',
  textMuted: '#4b5272',
  success: '#10b981',
  danger: '#ef4444',
};

function InfoBlock({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueBox}>
        <Text style={styles.value}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function FailurePredictionCard({
  loading = false,
  saving = false,
  error,
  predicted,
  onGenerate,
  onSave,
}: Props) {
  return (
    <>
      <Card style={styles.card}>
        <SectionLabel icon="cpu" title="Génération IA" />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onGenerate}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <FeatherIcon name="refresh-cw" size={15} color="#000000" />
          )}
          <Text style={styles.buttonText}>
            {loading ? 'Génération...' : 'Relancer génération IA'}
          </Text>
        </TouchableOpacity>
      </Card>

      {loading ? (
        <Card style={styles.card}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.loadingText}>Analyse en cours...</Text>
          </View>
        </Card>
      ) : null}

      {!!error && !loading ? (
        <Card style={styles.card}>
          <View style={styles.errorBox}>
            <FeatherIcon name="alert-triangle" size={16} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </Card>
      ) : null}

      {!!predicted && !loading ? (
        <>
          <Card style={styles.card}>
            <SectionLabel icon="database" title="Détails de la panne" />

            <InfoBlock
              label="Classe de panne"
              value={
                (predicted.failureClass || '-') +
                (predicted.failureClassDescription
                  ? ` - ${predicted.failureClassDescription}`
                  : '')
              }
            />

            <InfoBlock label="Remarques" value={predicted.remarks || '-'} />

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={onSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FeatherIcon name="save" size={15} color="#fff" />
              )}
              <Text style={styles.buttonText}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </Card>

          <FailureCodesList rows={predicted.codes} title="Codes prédits" />
        </>
      ) : null}
    </>
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
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: C.textSub,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  block: {
    marginTop: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
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
  value: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    fontWeight: '600',
  },
  button: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});