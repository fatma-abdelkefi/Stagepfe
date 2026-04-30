import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import BarcodeScanner from '../../../shared/components/common/BarcodeScanner';

import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import AppInput from '../../../shared/components/forms/AppInput';
import FormField from '../../../shared/components/forms/FormField';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import { useAddActualMaterialViewModel } from '../viewmodels/useAddActualMaterialViewModel';
import type { AddActualMaterialRouteParams } from '../types/material.types';

type Props = {
  route: RouteProp<Record<string, AddActualMaterialRouteParams>, string>;
};

const ISSUE_TYPES = [
  { value: 'ISSUE', label: 'Sortie', icon: 'arrow-up-right' },
  { value: 'RETURN', label: 'Retour', icon: 'arrow-down-left' },
] as const;

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  textSub: '#8b92b0',
  pill: 'rgba(61,106,255,0.12)',
};

export default function AddActualMaterialScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const [scannerVisible, setScannerVisible] = useState(false);
  const wonum = String(route.params?.wonum ?? '');
  const siteid = String(route.params?.siteid ?? '');

  const vm = useAddActualMaterialViewModel(route.params);
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
      title="Matériel réel"
      badgeText={wonum ? `OT #${wonum}` : undefined}
      badgeSecondaryText={siteid || undefined}
      submitTitle="Enregistrer"
      submitIcon="check"
      onSubmit={vm.submit}
      submitLoading={vm.saving}
      submitDisabled={vm.saving}
      onCancel={() => navigation.goBack()}
      successVisible={vm.successVisible}
      successTitle="Matériel ajouté !"
      successMessage="Le matériel réel a été enregistré avec succès."
      onCloseSuccess={vm.closeSuccess}
      errorVisible={vm.errorVisible}
      errorTitle="Erreur"
      errorMessage={vm.errorMessage}
      onCloseError={vm.closeError}
    >
      <View style={styles.card}>
        <SectionLabel icon="package" title="Article" />

        <FormField label="Code article" required>
          <AppInput
            icon="hash"
            value={vm.itemnum}
            onChangeText={vm.setItemnum}
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </FormField>

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

      <View style={styles.card}>
        <SectionLabel icon="archive" title="Stockage" />

        <FormField label="Magasin" required>
          <AppInput
            icon="map-pin"
            value={vm.storeloc}
            onChangeText={vm.setStoreloc}
            autoCapitalize="characters"
            returnKeyType="done"
          />
        </FormField>
      </View>
      <View style={styles.card}>
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
              </View>
      <View style={styles.card}>
        <SectionLabel icon="refresh-cw" title="Type de mouvement" />

        <View style={styles.pillRow}>
          {ISSUE_TYPES.map(type => {
            const active = vm.issuetype === type.value;

            return (
              <TouchableOpacity
                key={type.value}
                onPress={() => vm.setIssuetype(type.value)}
                style={[styles.pill, active && styles.pillActive]}
                activeOpacity={0.85}
              >
                <View style={[styles.pillIcon, active && styles.pillIconActive]}>
                  <FeatherIcon
                    name={type.icon as any}
                    size={13}
                    color={active ? C.accent : C.textSub}
                  />
                </View>

                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barcodeInputWrap: {
    flex: 1,
  },
  barcodeButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F9FAFB',
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: C.pill,
    borderColor: C.accent,
  },
  pillIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconActive: {
    backgroundColor: 'rgba(61,106,255,0.18)',
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSub,
  },
  pillLabelActive: {
    color: C.accent,
  },
});