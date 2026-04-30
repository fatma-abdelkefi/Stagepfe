import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FeatherIcon from 'react-native-vector-icons/Feather';

import SuccessModal from '../../../shared/components/feedback/SuccessModal';
import { colors, spacing, radius } from '../../../shared/theme';
import { useAddPlannedMaterialViewModel } from '../viewmodels/useAddPlannedMaterialViewModel';

type Props = {
  woKey: string;
  onCancel: () => void;
};

export default function MaterialForm({ woKey, onCancel }: Props) {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    description,
    setDescription,
    itemnum,
    setItemnum,
    quantity,
    setQuantity,
    location,
    setLocation,
    barcode,
    setBarcode,
    loading,
    message,
    canSubmit,
    addMaterial,
    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
  } = useAddPlannedMaterialViewModel({ woKey });

  return (
    <>
      <SuccessModal
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        onClose={closeSuccess}
      />

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <View style={styles.formIconContainer}>
            <FeatherIcon name="package" size={22} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.formTitle}>Informations du matériel</Text>
            <Text style={styles.formSubtitle}>
              Remplissez les détails ci-dessous
            </Text>
          </View>
        </View>

        <InputField
          label="Numéro d'article"
          placeholder="Ex: 0-0514"
          value={itemnum}
          onChangeText={setItemnum}
          icon="hash"
          required
          focused={focusedField === 'itemnum'}
          onFocus={() => setFocusedField('itemnum')}
          onBlur={() => setFocusedField(null)}
        />

        <InputField
          label="Description"
          placeholder="Description du matériel"
          value={description}
          onChangeText={setDescription}
          icon="file-text"
          required
          focused={focusedField === 'description'}
          onFocus={() => setFocusedField('description')}
          onBlur={() => setFocusedField(null)}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <InputField
              label="Quantité"
              placeholder="1"
              value={quantity?.toString() || ''}
              onChangeText={setQuantity}
              keyboardType="numeric"
              icon="package"
              required
              focused={focusedField === 'quantity'}
              onFocus={() => setFocusedField('quantity')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.halfWidth}>
            <InputField
              label="Emplacement"
              placeholder="CENTRAL"
              value={location}
              onChangeText={setLocation}
              icon="map-pin"
              required
              focused={focusedField === 'location'}
              onFocus={() => setFocusedField('location')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
        </View>

        <InputField
          label="Code-barres"
          placeholder="1234567890123"
          value={barcode}
          onChangeText={setBarcode}
          icon="maximize"
          focused={focusedField === 'barcode'}
          onFocus={() => setFocusedField('barcode')}
          onBlur={() => setFocusedField(null)}
        />

        {!!message && (
          <View style={styles.infoBox}>
            <FeatherIcon name="info" size={16} color={colors.primary} />
            <Text style={styles.infoText}>{message}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={addMaterial}
          style={[styles.addButton, !canSubmit && styles.disabled]}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FeatherIcon name="check" size={18} color="#fff" />
                <Text style={styles.addButtonText}>Ajouter le matériel</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.cancelButton} activeOpacity={0.9}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType,
  required,
  focused,
  onFocus,
  onBlur,
}: any) {
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

      <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
        <View style={styles.iconWrapper}>
          <FeatherIcon
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.mutedText}
          />
        </View>

        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          keyboardType={keyboardType}
          placeholderTextColor={colors.mutedText}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  formSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    color: colors.textSub,
  },

  fieldContainer: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  required: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.danger,
    marginLeft: 4,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    paddingRight: spacing.lg,
    paddingVertical: 12,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginTop: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  actionsContainer: {
    gap: spacing.md,
  },
  addButton: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSub,
  },

  disabled: {
    opacity: 0.55,
  },
});