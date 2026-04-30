import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import SectionLabel from '../../../shared/components/forms/SectionLabel';
import FormField from '../../../shared/components/forms/FormField';
import Divider from '../../../shared/components/forms/Divider';
import FormSubmitButton from '../../../shared/components/forms/FormSubmitButton';
import SuccessModal from '../../../shared/components/feedback/SuccessModal';
import ErrorModal from '../../../shared/components/feedback/ErrorModal';
import { colors } from '../../../shared/theme';
import { useAddActualMaterialViewModel } from '../viewmodels/useAddActualMaterialViewModel';
import type { AddActualMaterialRouteParams } from '../types/material.types';

type Props = {
  routeParams: AddActualMaterialRouteParams;
};

const ISSUE_TYPES = [
  { value: 'ISSUE', label: 'Sortie', icon: 'arrow-up-right' },
  { value: 'RETURN', label: 'Retour', icon: 'arrow-down-left' },
] as const;

export default function ActualMaterialForm({ routeParams }: Props) {
  const vm = useAddActualMaterialViewModel(routeParams);

  const inputStyle = (name: string) => [
    styles.input,
    vm.focused === name && styles.inputFocused,
  ];

  return (
    <>
      <SectionLabel icon="package" title="Article" />

      <FormField label="Code article *">
        <TextInput
          style={inputStyle('itemnum')}
          value={vm.itemnum}
          onChangeText={vm.setItemnum}
          autoCapitalize="characters"
          placeholder="Ex: 0-0514"
          placeholderTextColor={colors.mutedText}
          onFocus={() => vm.setFocused('itemnum')}
          onBlur={() => vm.setFocused(null)}
        />
      </FormField>

      <FormField label="Quantité *">
        <TextInput
          style={inputStyle('qty')}
          value={vm.quantity}
          onChangeText={vm.setQuantity}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor={colors.mutedText}
          onFocus={() => vm.setFocused('qty')}
          onBlur={() => vm.setFocused(null)}
        />
      </FormField>

      <Divider />

      <SectionLabel icon="archive" title="Stockage" />

      <FormField label="Magasin *">
        <TextInput
          style={inputStyle('store')}
          value={vm.storeloc}
          onChangeText={vm.setStoreloc}
          autoCapitalize="characters"
          placeholder="CENTRAL"
          placeholderTextColor={colors.mutedText}
          onFocus={() => vm.setFocused('store')}
          onBlur={() => vm.setFocused(null)}
        />
      </FormField>

      <Divider />

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
                  color={active ? colors.primary : colors.textSub}
                />
              </View>
              <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FormSubmitButton
        title={vm.saving ? 'Enregistrement…' : 'Enregistrer'}
        onPress={vm.submit}
        loading={vm.saving}
      />

      <Text style={styles.hint}>* Champs obligatoires</Text>

      <SuccessModal
        visible={vm.successVisible}
        title="Matériel ajouté !"
        message="Le matériel réel a été enregistré avec succès."
        onClose={vm.closeSuccess}
      />

      <ErrorModal
        visible={vm.errorVisible}
        title="Erreur"
        message={vm.errorMessage}
        onClose={vm.closeError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(61,106,255,0.12)',
    borderColor: colors.primary,
  },
  pillIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconActive: {
    backgroundColor: 'rgba(61,106,255,0.18)',
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
  },
  pillLabelActive: {
    color: colors.primary,
  },
  hint: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: '500',
  },
});