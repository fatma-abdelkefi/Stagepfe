import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import AppInput from '../../../shared/components/forms/AppInput';
import FormField from '../../../shared/components/forms/FormField';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import BarcodeScanner from '../../../shared/components/common/BarcodeScanner';
import { useAddPlannedMaterialViewModel } from '../viewmodels/useAddPlannedMaterialViewModel';
import type { AddPlannedMaterialRouteParams } from '../types/material.types';

type Props = {
  route: RouteProp<Record<string, AddPlannedMaterialRouteParams>, string>;
};

const C = {
  surface: '#111520',
  border: '#1e2235',
  accent: '#3d6aff',
};

export default function AddPlannedMaterialScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const [scannerVisible, setScannerVisible] = useState(false);

  const wonum = String(route.params?.wonum ?? '');
  const workorderid = route.params?.workorderid;
  const siteid = route.params?.siteid;

  const vm = useAddPlannedMaterialViewModel({
  wonum,
  woKey: String(workorderid ?? wonum),
  workorderid,
  siteid,
});

  if (scannerVisible) {
    return (
      <BarcodeScanner
        onClose={() => setScannerVisible(false)}
        onScan={(scannedValue: string) => {
          vm.setBarcode(scannedValue);
          setScannerVisible(false);
        }}
      />
    );
  }

  return (
    <AddEntityScreenLayout
      title="Ajouter un matériel"
      badgeText={wonum ? `OT #${wonum}` : undefined}
      submitTitle="Ajouter le matériel"
      submitIcon="plus-circle"
      onSubmit={vm.addMaterial}
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
        <SectionLabel icon="hash" title="Identification" />

        <FormField label="Numéro d'article" required>
          <AppInput
            icon="hash"
            value={vm.itemnum}
            onChangeText={vm.setItemnum}
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </FormField>

        <FormField label="Description" required>
          <AppInput
            icon="file-text"
            value={vm.description}
            onChangeText={vm.setDescription}
            returnKeyType="next"
          />
        </FormField>
      </View>

      <View style={styles.card}>
        <SectionLabel icon="archive" title="Logistique" />

        <View style={styles.row}>
          <View style={styles.half}>
            <FormField label="Quantité" required>
              <AppInput
                icon="layers"
                value={vm.quantity}
                onChangeText={vm.setQuantity}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </FormField>
          </View>

          <View style={styles.half}>
            <FormField label="Emplacement" required>
              <AppInput
                icon="map-pin"
                value={vm.location}
                onChangeText={vm.setLocation}
                autoCapitalize="characters"
                returnKeyType="next"
              />
            </FormField>
          </View>
        </View>

        <FormField label="Code-barres">
          <View style={styles.barcodeRow}>
            <View style={styles.barcodeInputWrap}>
              <AppInput
                icon="maximize"
                value={vm.barcode}
                onChangeText={vm.setBarcode}
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              onPress={() => setScannerVisible(true)}
              style={styles.scanBtn}
              activeOpacity={0.85}
            >
              <FeatherIcon name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </FormField>

        {!!vm.message && <Text style={styles.infoText}>{vm.message}</Text>}
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barcodeInputWrap: {
    flex: 1,
  },
  
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: C.accent,
  },
});