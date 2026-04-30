import React, { useEffect, useMemo, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import type { RootStackParamList } from '../../../app/navigation/types';
import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import FailureHeaderCard from '../components/FailureHeaderCard';
import FailurePredictionCard from '../components/FailurePredictionCard';
import { predictFailureWithAI } from '../services/aiFailurePredictionService';
import { saveLocalFailureReport } from '../services/localFailureReportService';
import type { PredictedFailureDetails } from '../types/failureReporting.types';
import {
  buildPredictedFailureDetails,
  getFailureReportCreationDate,
  safeTrim,
} from '../utils/failureFormatters';

type Props = {
  route: RouteProp<RootStackParamList, 'FailureReporting'>;
};

export default function FailureReportingScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const params = route.params;

  const creationDate = useMemo(() => getFailureReportCreationDate(), []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [predicted, setPredicted] = useState<PredictedFailureDetails | null>(null);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const wonum = safeTrim(params?.wonum);
  const siteid = safeTrim(params?.siteid);

  const buildAiPayloadFromWO = () => {
    const description = safeTrim(params?.description);

    const longDescription =
      safeTrim((params as any)?.description_longdescription) ||
      safeTrim((params as any)?.longDescription) ||
      safeTrim((params as any)?.longdescription);

    const mapLog = (w: any) =>
      safeTrim(
        w?.description ||
          w?.description_longdescription ||
          w?.longdescription ||
          w?.logtext,
      );

    const worklog = Array.isArray((params as any)?.workLogs)
      ? (params as any).workLogs.map(mapLog).filter(Boolean)
      : Array.isArray((params as any)?.worklog)
      ? (params as any).worklog.map(mapLog).filter(Boolean)
      : [];

    const activities = Array.isArray((params as any)?.activities)
      ? (params as any).activities
          .map((a: any) => safeTrim(a?.description || a?.taskid || a?.wonum))
          .filter(Boolean)
      : Array.isArray((params as any)?.woactivity)
      ? (params as any).woactivity
          .map((a: any) => safeTrim(a?.description || a?.taskid || a?.wonum))
          .filter(Boolean)
      : [];

    const actualMaterials = Array.isArray((params as any)?.actualMaterials)
      ? (params as any).actualMaterials
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

    const actualLabor = Array.isArray((params as any)?.actualLabor)
      ? (params as any).actualLabor
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
    if (hasLaunched || !params) return;
    setHasLaunched(true);
    handleGenerate();
  }, [hasLaunched, params]);

  return (
    <AddEntityScreenLayout
      title="Failure Reporting"
      badgeText={wonum ? `OT #${wonum}` : undefined}
      badgeSecondaryText={siteid || undefined}
      submitTitle="Enregistrer"
      submitIcon="save"
      onSubmit={handleSave}
      submitLoading={saving}
      submitDisabled={saving || !predicted}
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
      <FailureHeaderCard
        wonum={params?.wonum}
        description={params?.description}
        status={params?.status}
        assetnum={params?.assetnum}
        assetDescription={params?.assetDescription}
        location={params?.location}
        locationDescription={params?.locationDescription}
      />

      <FailurePredictionCard
        loading={loading}
        saving={saving}
        error={aiError}
        predicted={predicted}
        onGenerate={handleGenerate}
        onSave={handleSave}
      />
    </AddEntityScreenLayout>
  );
}