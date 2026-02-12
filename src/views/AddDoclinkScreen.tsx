import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FeatherIcon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAddDoclinkViewModel } from '../viewmodels/AddDoclinkViewModel';
import SuccessModal from '../components/SuccessModal';
import RNFS from 'react-native-fs';
import { launchImageLibrary } from 'react-native-image-picker';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddDoclink'>;
type RouteProps = RouteProp<RootStackParamList, 'AddDoclink'>;

export default function AddDoclinkScreen({ route }: { route: RouteProps }) {
  const navigation = useNavigation<NavProp>();
  const { ownerid, siteid } = route.params;

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
    documentName,
    setDocumentName,
    base64Data,
    setBase64Data,
    description,
    setDescription,
    loading,
    message,
    addDocument,
    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
  } = useAddDoclinkViewModel({
    ownerid,
    siteid,
    username,
    password,
    onSuccess: () => {
      // ✅ only one navigation here
      navigation.goBack();
    },
  });

  const pickFile = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'mixed' });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri ?? '';
        const name = asset.fileName ?? 'Fichier';

        if (!uri) return;

        const path = uri.replace('file://', '');
        const base64 = await RNFS.readFile(path, 'base64');

        console.log('📄 [pickFile] name:', name);
        console.log('📄 [pickFile] path:', path);
        console.log('📄 [pickFile] base64 length:', base64.length);

        setDocumentName(name);
        setBase64Data(base64);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SuccessModal
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        onClose={() => {
          // ✅ DO NOT navigate here
          closeSuccess();
        }}
      />

      {/* ... ton UI inchangé ... */}
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
          <Text style={styles.headerTitle}>Ajouter un Document</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerInfoItem}>
            <FeatherIcon name="clipboard" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerInfoText}>OT #{ownerid}</Text>
          </View>
          <View style={styles.headerInfoItem}>
            <FeatherIcon name="map-pin" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerInfoText}>Site {siteid}</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.formCard}>
            <TouchableOpacity onPress={pickFile} style={styles.fileButton}>
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.fileButtonGradient}>
                <FeatherIcon name="upload" size={18} color="#fff" />
                <Text style={styles.fileButtonText}>
                  {base64Data ? 'Fichier sélectionné ✅' : 'Choisir un fichier'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.label}>Nom du document *</Text>
            <TextInput value={documentName} onChangeText={setDocumentName} style={styles.input} />

            <Text style={styles.label}>Description</Text>
            <TextInput value={description} onChangeText={setDescription} style={styles.input} />

            {message ? <Text style={{ color: 'red' }}>{message}</Text> : null}
          </View>

          <TouchableOpacity
            onPress={addDocument}
            style={styles.addButton}
            disabled={loading || !documentName.trim() || !base64Data}
          >
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.addButtonGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.addButtonText}>Ajouter</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 15, paddingTop: 11, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerInfo: { flexDirection: 'row', gap: 8, marginTop: 10 },
  headerInfoItem: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerInfoText: { color: '#fff' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  fileButton: { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  fileButtonGradient: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  fileButtonText: { color: '#fff', fontWeight: '700' },
  label: { marginTop: 10, fontWeight: '700', color: '#0f172a' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginTop: 6 },
  addButton: { borderRadius: 14, overflow: 'hidden', marginTop: 14 },
  addButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '800' },
});