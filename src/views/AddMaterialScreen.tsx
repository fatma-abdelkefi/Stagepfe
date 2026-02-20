// src/views/AddMaterialScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useAddMaterialViewModel } from '../viewmodels/AddMaterialViewModel';
import SuccessModal from '../components/SuccessModal';

import { AppIcon, AppText, Colors, Gradients, Icons, Radius, Spacing } from '../ui';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddMaterial'>;
type RouteProps = RouteProp<RootStackParamList, 'AddMaterial'>;

function safeTrim(v: string) {
  return (v || '').trim();
}

export default function AddMaterialScreen({ route }: { route: RouteProps }) {
  const navigation = useNavigation<NavProp>();

  const { wonum, workorderid } = route.params;
  const woKey = workorderid ? String(workorderid) : String(wonum);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const getCredentials = async () => {
      const storedUsername = await AsyncStorage.getItem('@username');
      const storedPassword = await AsyncStorage.getItem('@password');

      if (!storedUsername || !storedPassword) {
        Alert.alert('Erreur', 'Veuillez vous reconnecter');
        navigation.replace('Login' as any);
        return;
      }

      setUsername(storedUsername);
      setPassword(storedPassword);
    };

    getCredentials();
  }, [navigation]);

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
    addMaterial,

    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
  } = useAddMaterialViewModel({
    woKey,
    username,
    password,
    onSuccess: () => navigation.goBack(),
  });

  const canSubmit = useMemo(() => {
    return (
      !!safeTrim(description) &&
      !!safeTrim(itemnum) &&
      quantity !== undefined &&
      !!safeTrim(location) &&
      !loading
    );
  }, [description, itemnum, quantity, location, loading]);

  const handleAddMaterial = () => {
    if (!safeTrim(description) || !safeTrim(itemnum) || quantity === undefined || !safeTrim(location)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs requis.');
      return;
    }
    addMaterial();
  };

  return (
    <SafeAreaView style={styles.container}>
      <SuccessModal
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        onClose={() => {
          closeSuccess();
          navigation.goBack();
        }}
      />

      {/* HEADER */}
      <LinearGradient
        colors={[...Gradients.header]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <AppIcon name={Icons.back} size={20} color="#fff" />
          </TouchableOpacity>

          <AppText style={styles.headerTitle}>Ajouter un Matériel</AppText>

          <View style={styles.backButton} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerInfoItem}>
            <AppIcon name={Icons.wo} size={16} color="rgba(255,255,255,0.85)" />
            <AppText style={styles.headerInfoText}>OT #{wonum}</AppText>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconContainer}>
                <AppIcon name={Icons.package} size={22} color={Colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <AppText style={styles.formTitle}>Informations du matériel</AppText>
                <AppText style={styles.formSubtitle}>Remplissez les détails ci-dessous</AppText>
              </View>
            </View>

            <InputField
              label="Numéro d'article"
              placeholder="Ex: 0-0514"
              value={itemnum}
              onChangeText={setItemnum}
              icon={Icons.hash}
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
              icon={Icons.fileText}
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
                  onChangeText={(text: string) => setQuantity(text === '' ? undefined : Number(text))}
                  keyboardType="numeric"
                  // tu avais "box" -> Feather n'a pas "box", donc on garde "package" (même icône visuelle)
                  icon={Icons.package}
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
                  icon={Icons.site}
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
              icon={Icons.maximize}
              focused={focusedField === 'barcode'}
              onFocus={() => setFocusedField('barcode')}
              onBlur={() => setFocusedField(null)}
            />

            {!!message && (
              <View style={styles.infoBox}>
                <AppIcon name={Icons.info} size={16} color={Colors.primary} />
                <AppText style={styles.infoText}>{message}</AppText>
              </View>
            )}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={handleAddMaterial}
              style={[styles.addButton, !canSubmit && styles.disabled]}
              disabled={!canSubmit || !username || !password}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[...Gradients.action]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <AppIcon name={Icons.check} size={18} color="#fff" />
                    <AppText style={styles.addButtonText}>Ajouter le matériel</AppText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton} activeOpacity={0.9}>
              <AppText style={styles.cancelButtonText}>Annuler</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: any;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  required?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <AppText style={styles.label}>{label}</AppText>
        {required && <AppText style={styles.required}>*</AppText>}
      </View>

      <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
        <View style={styles.iconWrapper}>
          <AppIcon name={icon} size={18} color={focused ? Colors.primary : Colors.placeholder} />
        </View>

        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          keyboardType={keyboardType}
          placeholderTextColor={Colors.placeholder}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: Radius.header,
    borderBottomRightRadius: Radius.header,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

  headerInfo: { flexDirection: 'row', alignItems: 'center' },
  headerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
  },
  headerInfoText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  content: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing.xl },

  formCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl, // = 20
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,

    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.softBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formTitle: { fontSize: 18, fontWeight: '900', color: Colors.text },
  formSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 2, color: Colors.muted },

  fieldContainer: { marginBottom: Spacing.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  label: { fontSize: 14, fontWeight: '800', color: Colors.text },
  required: { fontSize: 14, fontWeight: '900', color: Colors.danger, marginLeft: 4 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  inputContainerFocused: { borderColor: Colors.primary, backgroundColor: '#fff' },

  iconWrapper: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    paddingRight: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },

  row: { flexDirection: 'row', gap: Spacing.md },
  halfWidth: { flex: 1 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.softBlueBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginTop: Spacing.sm,
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.primary },

  actionsContainer: { gap: Spacing.md },

  addButton: { borderRadius: Radius.md, overflow: 'hidden' },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  addButtonText: { fontSize: 16, fontWeight: '900', color: '#fff' },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: { fontSize: 15, fontWeight: '800', color: Colors.muted },

  disabled: { opacity: 0.55 },
});
