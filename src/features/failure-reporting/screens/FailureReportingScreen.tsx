import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import type { RootStackParamList } from '../../../app/navigation/types';
import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import FailurePredictionCard from '../components/FailurePredictionCard';
import { predictFailureWithAI } from '../services/aiFailurePredictionService';
import type { PredictedFailureDetails } from '../types/failureReporting.types';
import {
  buildPredictedFailureDetails,
  getFailureReportCreationDate,
  safeTrim,
} from '../utils/failureFormatters';

import { useAuth } from '../../../app/providers/AuthProvider';
import { saveFailureReportToMaximo } from '../services/failureReportingMaximoService';
import { addValidatedFailureExample } from '../services/validatedFailureExampleService';
import { validateFailureHierarchy } from '../services/failureHierarchyValidationService';

type Props = {
  route: RouteProp<RootStackParamList, 'FailureReporting'>;
};

function getParamValue(params: any, keys: string[]): string {
  for (const key of keys) {
    const value = safeTrim(params?.[key]);
    if (value) return value;
  }

  return '';
}

function mapTextArray(
  items: any[] | undefined,
  mapper: (item: any) => string,
): string[] {
  if (!Array.isArray(items)) return [];

  return items
    .map(mapper)
    .map(value => safeTrim(value))
    .filter(Boolean);
}

function buildLearningText(params: any, predicted: PredictedFailureDetails): string {
  const problem = predicted.codes.find(x => x.type === 'PROBLEM');
  const cause = predicted.codes.find(x => x.type === 'CAUSE');
  const remedy = predicted.codes.find(x => x.type === 'REMEDY');

  return [
    safeTrim(params?.description),
    safeTrim(params?.description_longdescription),
    safeTrim(params?.longDescription),
    safeTrim(params?.longdescription),
    predicted.remarks,
    predicted.failureClass,
    problem?.code,
    cause?.code,
    remedy?.code,
  ]
    .filter(Boolean)
    .join(' ');
}

export default function FailureReportingScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const params = route.params;
  const { username, password } = useAuth();

  const creationDate = useMemo(() => getFailureReportCreationDate(), []);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [predicted, setPredicted] = useState<PredictedFailureDetails | null>(null);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [userEdited, setUserEdited] = useState(false);

  const wonum = safeTrim(params?.wonum);
  const siteid = safeTrim(params?.siteid) || 'BEDFORD';

  const buildAiPayloadFromWO = useCallback(() => {
    const description = safeTrim(params?.description);

    const longDescription = getParamValue(params, [
      'description_longdescription',
      'longDescription',
      'longdescription',
    ]);

    const worklog = Array.isArray((params as any)?.workLogs)
      ? mapTextArray((params as any).workLogs, (w: any) =>
          [
            w?.description,
            w?.description_longdescription,
            w?.longdescription,
            w?.logtext,
          ]
            .filter(Boolean)
            .join(' '),
        )
      : Array.isArray((params as any)?.worklog)
      ? mapTextArray((params as any).worklog, (w: any) =>
          [
            w?.description,
            w?.description_longdescription,
            w?.longdescription,
            w?.logtext,
          ]
            .filter(Boolean)
            .join(' '),
        )
      : [];

    const activities = Array.isArray((params as any)?.activities)
      ? mapTextArray((params as any).activities, (a: any) =>
          [a?.description, a?.taskid, a?.wonum].filter(Boolean).join(' '),
        )
      : Array.isArray((params as any)?.woactivity)
      ? mapTextArray((params as any).woactivity, (a: any) =>
          [a?.description, a?.taskid, a?.wonum].filter(Boolean).join(' '),
        )
      : [];

    const actualMaterials = Array.isArray((params as any)?.actualMaterials)
      ? mapTextArray((params as any).actualMaterials, (m: any) =>
          [
            m?.itemnum,
            m?.description || m?.itemdesc,
            m?.quantity ?? m?.itemqty ?? m?.qty,
          ]
            .filter(Boolean)
            .join(' '),
        )
      : [];

    const actualLabor = Array.isArray((params as any)?.actualLabor)
      ? mapTextArray((params as any).actualLabor, (l: any) =>
          [l?.laborcode, l?.craft, l?.skilllevel, l?.regularhrs]
            .filter(Boolean)
            .join(' '),
        )
      : [];

    const assetText = [
      safeTrim(params?.assetnum),
      safeTrim((params as any)?.asset),
      safeTrim(params?.assetDescription),
    ]
      .filter(Boolean)
      .join(' ');

    const locationText =
      safeTrim(params?.location) || safeTrim(params?.locationDescription);

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
  }, [params]);

  const handleGenerate = useCallback(async () => {
    try {
      setLoading(true);
      setAiError(null);
      setPredicted(null);
      setUserEdited(false);

      const payload = buildAiPayloadFromWO();

      const hasUsefulText =
        safeTrim(payload.description) ||
        safeTrim(payload.long_description) ||
        safeTrim(payload.assetnum) ||
        safeTrim(payload.location) ||
        payload.worklog.length > 0 ||
        payload.activities.length > 0 ||
        payload.actual_materials.length > 0 ||
        payload.actual_labor.length > 0;

      if (!hasUsefulText) {
        setAiError(
          'Veuillez ajouter au moins une description ou des informations sur le Work Order.',
        );
        return;
      }

      const data = await predictFailureWithAI(payload);
      const nextPredicted = buildPredictedFailureDetails(data, creationDate);

      setPredicted(nextPredicted);
    } catch (e: any) {
      setAiError(e?.message || 'Erreur lors de la génération du failure reporting.');
    } finally {
      setLoading(false);
    }
  }, [buildAiPayloadFromWO, creationDate]);

  const handleChangePredicted = useCallback((next: PredictedFailureDetails) => {
    setPredicted({
      ...next,
      lowConfidence: false,
      validationRequired: false,
      recommendationMessage: 'Codes vérifiés ou corrigés par le technicien.',
    });

    setUserEdited(true);
    setAiError(null);
  }, []);

  const handleSave = useCallback(async () => {
  if (!predicted) {
    setAiError('Aucun signalement à enregistrer.');
    return;
  }

  if (!wonum || !siteid) {
    setAiError('WO ou site manquant.');
    return;
  }

  const problem = predicted.codes.find(x => x.type === 'PROBLEM');
  const cause = predicted.codes.find(x => x.type === 'CAUSE');
  const remedy = predicted.codes.find(x => x.type === 'REMEDY');

  const failureClass = safeTrim(predicted.failureClass);

  const problemCode = safeTrim(problem?.code);
  const causeCode = safeTrim(cause?.code);
  const remedyCode = safeTrim(remedy?.code);

  const problemDescription = safeTrim(problem?.description);
  const causeDescription = safeTrim(cause?.description);
  const remedyDescription = safeTrim(remedy?.description);

  const remark = safeTrim(predicted.remarks);

  console.log('🔥 FAILURE SELECTED CODES =', {
    failureClass,
    problemCode,
    causeCode,
    remedyCode,
    remark,
    allCodes: predicted.codes,
  });

  if (!failureClass || !problemCode || !causeCode || !remedyCode) {
    setAiError(
      [
        'Failure Reporting incomplet.',
        '',
        `Classe : ${failureClass || '—'}`,
        `Problème : ${problemCode || '—'}`,
        `Cause : ${causeCode || '—'}`,
        `Remède : ${remedyCode || '—'}`,
        '',
        'La classe de panne, le problème, la cause et le remède sont obligatoires.',
      ].join('\n'),
    );
    return;
  }

  const status = safeTrim((params as any)?.status).toUpperCase();

  if (status === 'CLOSE' || status === 'CLOSED' || status === 'COMP') {
    setAiError(
      "Impossible d'enregistrer le Failure Reporting : l'ordre de travail est déjà fermé.",
    );
    return;
  }

  try {
    setSaving(true);
    setAiError(null);

    const validation = await validateFailureHierarchy({
      failure_class: failureClass,
      problem: problemCode,
      cause: causeCode,
      remedy: remedyCode,
    });

    if (validation.is_valid === false) {
      const warnings = validation.warnings?.length
        ? validation.warnings.join('\n')
        : 'Combinaison failure_class/problem/cause/remedy non validée.';

      setAiError(
        [
          'Hiérarchie Failure Reporting invalide.',
          warnings,
          'Veuillez choisir une combinaison valide avant enregistrement Maximo.',
        ].join('\n'),
      );
      return;
    }

    const report = {
      failureClass,
      failureClassDescription: safeTrim(predicted.failureClassDescription),

      failureDate: predicted.failureDate,
      remarkDate: predicted.remarkDate,
      remark,

      problem: problemCode,
      problemCode,
      problemDescription,

      cause: causeCode,
      causeCode,
      causeDescription,

      remedy: remedyCode,
      remedyCode,
      remedyDescription,

      codes: predicted.codes,
    };

    console.log('🔥 FAILURE REPORT TO SAVE =', JSON.stringify(report, null, 2));
    console.log('FAILURE PARAMS =', params);
    console.log('FAILURE HREF =', (params as any)?.href);
    console.log('FAILURE WOHREF =', (params as any)?.woHref);

    await saveFailureReportToMaximo({
      username: String(username || ''),
      password: String(password || ''),
      wonum,
      siteid,
      woHref: safeTrim((params as any)?.woHref) || safeTrim((params as any)?.href),
      report,
    });

    try {
      const learningText = buildLearningText(params, predicted);

      await addValidatedFailureExample({
        text: learningText || remark || safeTrim(params?.description),

        failure_class: failureClass,
        problem: problemCode,
        cause: causeCode,
        remedy: remedyCode,

        wonum,
        siteid,

        description: safeTrim(params?.description),
        details:
          safeTrim((params as any)?.description_longdescription) ||
          safeTrim((params as any)?.longDescription) ||
          safeTrim((params as any)?.longdescription),

        assetnum: safeTrim(params?.assetnum),
        asset_description: safeTrim(params?.assetDescription),
        location: safeTrim(params?.location) || safeTrim(params?.locationDescription),

        source: 'mobile_confirmed_failure',
        metadata: {
          origin: 'mobile_app',
          module: 'failure_reporting',
          saved_to_maximo: true,
          user_edited: userEdited,
          confidence_before_user_validation: predicted.confidence,
          validation_tool: 'validate_failure_hierarchy',
          validation_result: validation,
        },
      });
    } catch (learningError) {
      console.log('Failure learning save skipped/error =', learningError);
    }

    setSuccessVisible(true);
  } catch (e: any) {
    setAiError(e?.message || "Impossible d'enregistrer le failure reporting.");
  } finally {
    setSaving(false);
  }
}, [predicted, userEdited, wonum, siteid, params, username, password]);

  useEffect(() => {
    if (hasLaunched || !params) return;

    setHasLaunched(true);
    handleGenerate();
  }, [hasLaunched, params, handleGenerate]);

  return (
    <AddEntityScreenLayout
      title="Failure Reporting"
      badgeText={wonum ? `OT #${wonum}` : undefined}
      badgeSecondaryText={siteid || undefined}
      submitTitle="Enregistrer"
      submitIcon="save"
      onSubmit={handleSave}
      submitLoading={saving}
      submitDisabled={saving || loading || !predicted}
      onCancel={() => navigation.goBack()}
      successVisible={successVisible}
      successTitle="Failure reporting enregistré"
      successMessage="Le failure reporting a été enregistré avec succès."
      onCloseSuccess={() => {
        setSuccessVisible(false);
        navigation.goBack();
      }}
      errorVisible={!!aiError && !loading}
      errorTitle="Erreur"
      errorMessage={aiError || ''}
      onCloseError={() => setAiError(null)}
    >
      <FailurePredictionCard
        loading={loading}
        saving={saving}
        error={null}
        predicted={predicted}
        siteid={siteid}
        editable
        onChangePredicted={handleChangePredicted}
      />
    </AddEntityScreenLayout>
  );
}