// src/views/AddDocumentScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FeatherIcon from 'react-native-vector-icons/Feather';
import RNFS from 'react-native-fs';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';

export default function AddDocumentScreen() {
  const navigation = useNavigation();
  
  const [folder, setFolder] = useState<string>('Attachments');
  const [fileName, setFileName] = useState<string>('');
  const [fileUri, setFileUri] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const pickFile = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFileUri(asset.uri ?? '');
        setFileName(asset.fileName ?? 'Fichier');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const submitDocument = async () => {
    if (!fileUri) {
      Alert.alert('Erreur', 'Veuillez sélectionner un fichier');
      return;
    }

    if (!fileName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de document');
      return;
    }

    setLoading(true);
    try {
      const content = await RNFS.readFile(fileUri.replace('file://', ''), 'base64');
      console.log('Base64:', content.slice(0, 100));

      // Simuler un délai d'upload
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Succès',
        `Document ajouté avec succès!\n\nNom: ${fileName}\nDossier: ${folder}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      // Ici tu peux envoyer `content` à ton API Maximo
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de lire le fichier');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>Ajouter un Document</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerInfoItem}>
            <FeatherIcon name="folder" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerInfoText}>{folder}</Text>
          </View>
          {fileUri ? (
            <View style={styles.headerInfoItem}>
              <FeatherIcon name="check-circle" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.headerInfoText}>Fichier sélectionné</Text>
            </View>
          ) : null}
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
                <FeatherIcon name="file-plus" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.formTitle}>Informations du document</Text>
                <Text style={styles.formSubtitle}>Remplissez les détails ci-dessous</Text>
              </View>
            </View>

            <View style={styles.formBody}>
              {/* Folder Picker */}
              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Dossier de destination</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={[styles.pickerContainer, focusedField === 'folder' && styles.inputContainerFocused]}>
                  <View style={styles.iconWrapper}>
                    <FeatherIcon name="folder" size={18} color="#3b82f6" />
                  </View>
                  <Picker
                    selectedValue={folder}
                    onValueChange={(value) => setFolder(value.toString())}
                    style={styles.picker}
                    onFocus={() => setFocusedField('folder')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <Picker.Item label="Attachments" value="Attachments" />
                    <Picker.Item label="Diagrams" value="Diagrams" />
                    <Picker.Item label="Images" value="Images" />
                  </Picker>
                </View>
              </View>

              {/* File Picker Button */}
              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Fichier</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <TouchableOpacity onPress={pickFile} style={styles.filePickerButton}>
                  <LinearGradient
                    colors={fileUri ? ['#10b981', '#059669'] : ['#3b82f6', '#2563eb']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filePickerGradient}
                  >
                    <View style={styles.filePickerContent}>
                      <View style={styles.filePickerLeft}>
                        <FeatherIcon name={fileUri ? 'check-circle' : 'upload'} size={20} color="#fff" />
                        <Text style={styles.filePickerText} numberOfLines={1}>
                          {fileUri ? 'Fichier sélectionné' : 'Choisir un fichier'}
                        </Text>
                      </View>
                      <FeatherIcon name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                {fileUri ? (
                  <View style={styles.fileInfoBox}>
                    <FeatherIcon name="file" size={14} color="#3b82f6" />
                    <Text style={styles.fileInfoText} numberOfLines={1}>{fileName}</Text>
                  </View>
                ) : null}
              </View>

              {/* File Name Input */}
              <InputField
                label="Nom du document"
                placeholder="Ex: Plan_Batiment_A"
                value={fileName}
                onChangeText={setFileName}
                icon="edit-3"
                required
                focused={focusedField === 'fileName'}
                onFocus={() => setFocusedField('fileName')}
                onBlur={() => setFocusedField(null)}
              />

              {/* Info Box */}
              {fileUri && (
                <View style={styles.infoBox}>
                  <FeatherIcon name="info" size={16} color="#3b82f6" />
                  <Text style={styles.infoText}>
                    Le fichier sera téléchargé dans le dossier "{folder}"
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={submitDocument}
              style={styles.submitButton}
              disabled={loading || !fileUri || !fileName.trim()}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.submitButtonGradient,
                  (loading || !fileUri || !fileName.trim()) && styles.submitButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FeatherIcon name="check" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Ajouter le document</Text>
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
  focused,
  onFocus,
  onBlur,
}: any) => (
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  content: { flex: 1 },
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
  formTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  formSubtitle: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2 },
  formBody: { gap: 0 },
  fieldContainer: { marginBottom: 20 },
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
  inputContainerFocused: { borderColor: '#3b82f6', backgroundColor: '#fff' },
  iconWrapper: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    paddingRight: 16,
    paddingVertical: 14,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  picker: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  filePickerButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  filePickerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  filePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  filePickerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  fileInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fileInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
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
  infoText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  actionsContainer: { gap: 12 },
  submitButton: { borderRadius: 14, overflow: 'hidden' },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
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