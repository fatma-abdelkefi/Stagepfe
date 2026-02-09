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
import SuccessModal from '../components/SuccessModal'; 

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddLabor'>;
type RouteProps = RouteProp<RootStackParamList, 'AddLabor'>;

export default function AddLaborScreen({ route }: { route: RouteProps }) {
  const navigation = useNavigation<NavProp>();
  const { workorderid, siteid } = route.params;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
  }, [navigation]);

  const {
    laborCode,
    setLaborCode,
    hours,
    setHours,
    loading,
    message,
    addLabor,

    // ✅ modal
    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
  } = useAddLaborViewModel({
    workorderid,
    siteid,
    username,
    password,
  });

  const handleAddLabor = async () => {
    await addLabor(); 
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ Success Popup */}
      <SuccessModal
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        onClose={() => {
          closeSuccess();
          navigation.goBack(); 
        }}
      />

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

        <View style={styles.headerInfo}>
          <View style={styles.headerInfoItem}>
            <FeatherIcon name="clipboard" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerInfoText}>OT #{workorderid}</Text>
          </View>
          <View style={[styles.headerInfoItem, { marginLeft: 10 }]}>
            <FeatherIcon name="map-pin" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerInfoText}>Site {siteid}</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconContainer}>
                <FeatherIcon name="users" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.formTitle}>Informations Main d'œuvre</Text>
                <Text style={styles.formSubtitle}>Remplissez les détails ci-dessous</Text>
              </View>
            </View>

            <InputField
              label="Code Labor"
              placeholder="Ex: ADAMS"
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

            {/* message VM */}
            {message ? (
              <View style={styles.infoBox}>
                <FeatherIcon name="info" size={16} color="#ef4444" />
                <Text style={styles.infoText}>{message}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity onPress={handleAddLabor} style={styles.addButton} disabled={loading}>
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.addButtonGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FeatherIcon name="check" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Ajouter</Text>
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
    marginBottom: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  headerInfo: { flexDirection: 'row', alignItems: 'center' },
  headerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerInfoText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  scrollContent: { padding: 20, paddingBottom: 40 },

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
    marginBottom: 18,
    paddingBottom: 16,
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
  formTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  formSubtitle: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2 },

  fieldContainer: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  required: { fontSize: 14, fontWeight: '700', color: '#ef4444', marginLeft: 4 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a', paddingVertical: 14 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff1f2',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#ef4444' },

  actionsContainer: { gap: 12 },
  addButton: { borderRadius: 14, overflow: 'hidden' },
  addButtonGradient: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
});