// src/views/AddLaborScreen.tsx
import React, { useEffect, useState } from 'react';
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
import { useAddLaborViewModel } from '../viewmodels/AddLaborViewModel';


type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddLabor'>;
type RouteProps = RouteProp<RootStackParamList, 'AddLabor'>;

export default function AddLaborScreen({ route }: { route: RouteProps }) {
  const navigation = useNavigation<NavProp>();
  const { workOrderId: workOrderIdParam, site } = route.params;
  const workOrderId = Number(workOrderIdParam);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // ─── Fetch credentials
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

  // ─── ViewModel
  const {
    laborCode,
    setLaborCode,
    hours,
    setHours,
    loading,
    message,
    addLabor,
  } = useAddLaborViewModel({
    workOrderId,
    username,
    password,
    site,
    onSuccess: () => {
    navigation.goBack();
    },
  });

  // ─── Handle Add Button
  const handleAddLabor = async () => {
    if (!laborCode || !hours) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      await addLabor(); 
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d’ajouter le labor.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
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
          <Text style={styles.headerTitle}>Ajouter un Labor</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <InputField
              label="Code Labor"
              placeholder="Ex: LAB-001"
              value={laborCode}
              onChangeText={setLaborCode}
              icon="hash"
              required
            />

            <InputField
              label="Heures"
              placeholder="0"
              value={hours?.toString() || ''}
              onChangeText={(text: string) => setHours(text ? Number(text) : undefined)}
              icon="clock"
              keyboardType="numeric"
              required
            />

            {message ? <Text style={{ color: '#ef4444', marginTop: 10 }}>{message}</Text> : null}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity onPress={handleAddLabor} style={styles.addButton} disabled={loading}>
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.addButtonGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.addButtonText}>Ajouter</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── InputField
const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType,
  required,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  required?: boolean;
}) => (
  <View style={styles.fieldContainer}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <Text style={styles.required}>*</Text>}
    </View>
    <View style={styles.inputContainer}>
      <FeatherIcon name={icon} size={18} color="#94a3b8" style={{ marginHorizontal: 10 }} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#cbd5e1"
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 15, paddingTop: 11, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scrollContent: { padding: 20 },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20 },
  fieldContainer: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  required: { fontSize: 14, fontWeight: '700', color: '#ef4444', marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', overflow: 'hidden' },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a', paddingVertical: 14 },
  actionsContainer: { gap: 12 },
  addButton: { borderRadius: 14, overflow: 'hidden' },
  addButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
