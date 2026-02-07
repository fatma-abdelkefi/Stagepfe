// src/views/AddMaterialScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import FeatherIcon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAddMaterialViewModel } from '../viewmodels/AddMaterialViewModel';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddMaterial'>;
type RouteProps = RouteProp<RootStackParamList, 'AddMaterial'>;

export default function AddMaterialScreen({ route }: { route: RouteProps }) {
  const navigation = useNavigation<NavProp>();
  const { wonum } = route.params;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Convert wonum to number safely
  const workOrderId = Number(wonum);
  if (isNaN(workOrderId)) {
    Alert.alert('Erreur', 'Numéro d\'OT invalide');
    navigation.goBack();
    return null;
  }

  // Fetch credentials
  useEffect(() => {
    const getCredentials = async () => {
      const storedUsername = await AsyncStorage.getItem('@username');
      const storedPassword = await AsyncStorage.getItem('@password');

      if (!storedUsername || !storedPassword) {
        Alert.alert('Erreur', 'Veuillez vous reconnecter');
        navigation.replace('Login');
        return;
      }

      setUsername(storedUsername);
      setPassword(storedPassword);
    };
    getCredentials();
  }, []);

  // ✅ Pass the siteid here
  const siteid = 'SITE01'; // <-- Replace with your actual Maximo site ID

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
  } = useAddMaterialViewModel({
    workOrderId,
    username,
    password, // <- must pass this
    onSuccess: () => {
      setDescription('');
      setQuantity(undefined);
      setItemnum('');
      setLocation('');
      setBarcode('');
      navigation.goBack();
    },
  });

  const handleAddMaterial = () => {
    if (!description || !itemnum || quantity === undefined || !location) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs requis.');
      return;
    }

    console.log('🔹 handleAddMaterial payload:', {
      description,
      itemnum,
      quantity,
      location,
      barcode,
      siteid,
    });

    addMaterial();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1e40af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FeatherIcon name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ajouter un Matériel</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerInfoItem}>
            <FeatherIcon name="clipboard" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerInfoText}>OT #{wonum}</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* FORM CARD */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconContainer}>
                <FeatherIcon name="package" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.formTitle}>Informations du matériel</Text>
                <Text style={styles.formSubtitle}>Remplissez les détails ci-dessous</Text>
              </View>
            </View>

            <View style={styles.formBody}>
              {/* Input fields */}
              <InputField
                label="Numéro d'article"
                placeholder="Ex: MAT-001"
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
                    placeholder="0"
                    value={quantity?.toString() || ''}
                    onChangeText={(text: string) => setQuantity(text === '' ? undefined : Number(text))}
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
                    placeholder="Ex: A-12"
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
                placeholder="Scanner ou saisir le code-barres"
                value={barcode}
                onChangeText={setBarcode}
                icon="maximize"
                focused={focusedField === 'barcode'}
                onFocus={() => setFocusedField('barcode')}
                onBlur={() => setFocusedField(null)}
                hasScanner
                onScanPress={() => Alert.alert('Scanner', 'Fonction de scan à implémenter')}
              />

              {message ? (
                <View style={styles.infoBox}>
                  <FeatherIcon name="info" size={16} color="#3b82f6" />
                  <Text style={styles.infoText}>{message}</Text>
                </View>
              ) : null}

              <View style={styles.infoBox}>
                <FeatherIcon name="info" size={16} color="#3b82f6" />
                <Text style={styles.infoText}>
                  Les champs marqués d'un * sont obligatoires
                </Text>
              </View>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={handleAddMaterial}
              style={styles.addButton}
              disabled={loading || !username || !password}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FeatherIcon name="check" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Ajouter le matériel</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// InputField (unchanged)
const InputField = ({ label, placeholder, value, onChangeText, icon, keyboardType, required, focused, onFocus, onBlur, hasScanner, onScanPress }: any) => (
  <View style={styles.fieldContainer}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <Text style={styles.required}>*</Text>}
    </View>
    <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
      <View style={styles.iconWrapper}>
        <FeatherIcon name={icon} size={18} color={focused ? '#3b82f6' : '#94a3b8'} />
      </View>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        keyboardType={keyboardType}
        placeholderTextColor="#cbd5e1"
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {hasScanner && (
        <TouchableOpacity style={styles.scanButton} onPress={onScanPress} activeOpacity={0.7}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scanButtonGradient}
          >
            <FeatherIcon name="camera" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  formSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  formBody: {
    gap: 0,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  required: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontWeight: '600',
    color: '#0f172a',
    paddingRight: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  actionsContainer: {
    gap: 12,
  },
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  scanButton: {
    marginRight: 8,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
