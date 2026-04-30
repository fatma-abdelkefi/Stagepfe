import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';

import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import AppInput from '../../../shared/components/forms/AppInput';
import FormField from '../../../shared/components/forms/FormField';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import { useAddPlannedLaborViewModel } from '../viewmodels/useAddPlannedLaborViewModel';
import type { AddPlannedLaborRouteParams } from '../types/labor.types';

type Props = {
  route: RouteProp<Record<string, AddPlannedLaborRouteParams>, string>;
};

const C = {
  surface: '#111520',
  border: '#1e2235',
};

export default function AddPlannedLaborScreen({ route }: Props) {
  const navigation = useNavigation<any>();

  const wonum = String(route.params?.wonum ?? '');
  const workorderid = route.params?.workorderid;
  const siteid = route.params?.siteid;

  const vm = useAddPlannedLaborViewModel({
    woKey: String(workorderid ?? wonum),
    workorderid,
    siteid,
  });

  return (
    <AddEntityScreenLayout
      title="Ajouter main d'œuvre"
      badgeText={wonum ? `OT #${wonum}` : undefined}
      submitTitle="Ajouter"
      submitIcon="plus-circle"
      onSubmit={vm.addLabor}
      submitLoading={vm.loading}
      submitDisabled={!vm.canSubmit}
      onCancel={() => navigation.goBack()}
      successVisible={vm.successVisible}
      successTitle={vm.successTitle}
      successMessage={vm.successMessage}
      onCloseSuccess={vm.closeSuccess}
      errorVisible={vm.errorVisible}
      errorTitle={vm.errorTitle}
      errorMessage={vm.errorMessage}
      onCloseError={vm.closeError}
    >
      <View style={styles.card}>
        <SectionLabel icon="users" title="Main d'œuvre planifiée" />

        <FormField label="Code main d'oeuvre" required>
          <AppInput
            icon="hash"
            value={vm.laborCode}
            onChangeText={vm.setLaborCode}
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </FormField>

        <FormField label="Heures" required>
          <AppInput
            icon="clock"
            value={vm.hours}
            onChangeText={vm.setHours}
            keyboardType="numeric"
            returnKeyType="next"
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