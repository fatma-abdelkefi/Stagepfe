import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useAddDoclinkViewModel } from '../viewmodels/AddDoclinkViewModel';
import SuccessModal from '../components/SuccessModal';

import RNFS from 'react-native-fs';
import { launchImageLibrary } from 'react-native-image-picker';

import { AppIcon, AppText, Colors, Gradients, Icons, Radius, Spacing } from '../ui';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddDoclink'>;
type RouteProps = RouteProp<RootStackParamList, 'AddDoclink'>;

function safeTrim(v: string) {
  return (v || '').trim();
}

export default function AddDoclinkScreen({ route }: { route: RouteProps }) {
  const navigation = useNavigation<NavProp>();
  const { ownerid, siteid } = route.params;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
    onSuccess: () => navigation.goBack(),
  });

  const canSubmit = useMemo(() => {
    return !!safeTrim(documentName) && !!safeTrim(base64Data) && !loading;
  }, [documentName, base64Data, loading]);

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
        onClose={closeSuccess}
      />

      {/* Header */}
      <LinearGradient
        colors={[...Gradients.header]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <AppIcon name={Icons.back} size={20} color="#fff" />
          </TouchableOpacity>

          <AppText style={styles.headerTitle}>Ajouter un Document</AppText>

          <View style={styles.iconBtn} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerInfoItem}>
            <AppIcon name={Icons.wo} size={16} color="rgba(255,255,255,0.85)" />
            <AppText style={styles.headerInfoText}>OT #{ownerid}</AppText>
          </View>

          <View style={styles.headerInfoItem}>
            <AppIcon name={Icons.site} size={16} color="rgba(255,255,255,0.85)" />
            <AppText style={styles.headerInfoText}>Site {siteid}</AppText>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <TouchableOpacity onPress={pickFile} style={styles.fileButton} activeOpacity={0.9}>
              <LinearGradient colors={[...Gradients.action]} style={styles.fileButtonGradient}>
                <AppIcon name={Icons.upload} size={18} color="#fff" />
                <AppText style={styles.fileButtonText}>
                  {base64Data ? 'Fichier sélectionné ✅' : 'Choisir un fichier'}
                </AppText>
              </LinearGradient>
            </TouchableOpacity>

            <AppText style={styles.label}>Nom du document *</AppText>
            <TextInput
              value={documentName}
              onChangeText={setDocumentName}
              placeholder="Ex: facture.pdf"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
              autoCapitalize="none"
            />

            <AppText style={styles.label}>Description</AppText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: photo avant intervention"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
            />

            {!!message && (
              <View style={styles.errorBox}>
                {/* Feather icon not in Icons list by default -> keep direct name */}
                <AppIcon name="alert-triangle" size={16} color={Colors.danger} />
                <AppText style={styles.errorText}>{message}</AppText>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={addDocument}
            style={[styles.addButton, !canSubmit && styles.disabled]}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
            <LinearGradient colors={[...Gradients.action]} style={styles.addButtonGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <AppText style={styles.addButtonText}>Ajouter</AppText>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  headerInfo: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  headerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerInfoText: { color: '#fff', fontWeight: '600' },

  content: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing.xl },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl, // same look as your large radius
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  fileButton: { borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.lg },
  fileButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  fileButtonText: { color: '#fff', fontWeight: '800' },

  label: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    fontWeight: '700',
    color: Colors.text,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    marginTop: Spacing.xs,
    backgroundColor: Colors.bg,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  errorBox: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF5F5',
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  errorText: { flex: 1, color: Colors.danger, fontWeight: '600' },

  addButton: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.lg },
  addButtonGradient: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '900', letterSpacing: 0.3 },

  disabled: { opacity: 0.55 },
});
