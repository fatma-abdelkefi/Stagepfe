import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';

import { useAuth } from '../../../app/providers/AuthProvider';
import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import AppInput from '../../../shared/components/forms/AppInput';
import FormField from '../../../shared/components/forms/FormField';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import { addActualLabor } from '../services/actualLaborService';
import type { AddActualLaborRouteParams } from '../types/labor.types';

type Props = {
  route: RouteProp<Record<string, AddActualLaborRouteParams>, string>;
};

const C = {
  surface: '#111520',
  border: '#1e2235',
};

export default function AddActualLaborScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { username, password } = useAuth();

  const woHref = String(route.params?.woHref ?? '').trim();
  const wonum = String(route.params?.wonum ?? '');
  const siteid = String(route.params?.siteid ?? '');

  const [laborcode, setLaborcode] = useState('');
  const [regularhrs, setRegularhrs] = useState('1');

  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const parsedHrs = Number(String(regularhrs || '').replace(',', '.'));

  const canSubmit = useMemo(() => {
    return (
      !!woHref &&
      !!laborcode.trim() &&
      !Number.isNaN(parsedHrs) &&
      parsedHrs > 0 &&
      !!username &&
      !!password &&
      !saving
    );
  }, [woHref, laborcode, parsedHrs, username, password, saving]);

  const submit = async () => {
    if (!woHref) {
      showError("Lien OT introuvable (woHref manquant).");
      return;
    }

    if (!laborcode.trim()) {
      showError("Le code main d'œuvre est obligatoire.");
      return;
    }

    if (!Number.isFinite(parsedHrs) || parsedHrs <= 0) {
      showError('Les heures doivent être supérieures à 0.');
      return;
    }

    if (!username || !password) {
      showError('Identifiants non trouvés. Veuillez vous reconnecter.');
      return;
    }

    try {
      setSaving(true);

      await addActualLabor(woHref, username, password, {
        laborcode: laborcode.trim(),
        regularhrs: parsedHrs,
      });

      setSuccessVisible(true);
    } catch (e: any) {
      showError(
        String(e?.message ?? "Impossible d'ajouter la main d'œuvre réelle."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AddEntityScreenLayout

      title="Main d'œuvre réelle"
      badgeText={wonum ? `OT #${wonum}` : undefined}
      badgeSecondaryText={siteid || undefined}
      submitTitle="Enregistrer"
      submitIcon="check"
      onSubmit={submit}
      submitLoading={saving}
      submitDisabled={!canSubmit}
      onCancel={() => navigation.goBack()}
      successVisible={successVisible}
      successTitle="Main d'œuvre ajoutée !"
      successMessage="La main d'œuvre réelle a été enregistrée avec succès."
      onCloseSuccess={() => {
        setSuccessVisible(false);
        navigation.goBack();
      }}
      errorVisible={errorVisible}
      errorTitle="Erreur"
      errorMessage={errorMessage}
      onCloseError={() => setErrorVisible(false)}
    >
      <View style={styles.card}>
        <SectionLabel icon="user-check" title="Main d'œuvre réelle" />

        <FormField label="Code main d'œuvre" required>
          <AppInput
            icon="hash"
            value={laborcode}
            onChangeText={setLaborcode}
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </FormField>

        <FormField label="Heures régulières" required>
          <AppInput
            icon="clock"
            value={regularhrs}
            onChangeText={setRegularhrs}
            keyboardType="numeric"
            returnKeyType="done"
          />
        </FormField>
      </View>
    </AddEntityScreenLayout>
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
});