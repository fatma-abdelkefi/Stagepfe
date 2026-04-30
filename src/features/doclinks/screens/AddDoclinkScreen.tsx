import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import {
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { launchCamera } from 'react-native-image-picker';

import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import AppInput from '../../../shared/components/forms/AppInput';
import FormField from '../../../shared/components/forms/FormField';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import AppPermissionsModal from '../../startup/components/AppPermissionsModal';

import { useAuth } from '../../../app/providers/AuthProvider';
import { useAddDoclinkViewModel } from '../viewmodels/useAddDoclinkViewModel';
import { useWorkOrdersPermissionsViewModel } from '../../workorders/viewmodels/useWorkOrdersPermissionsViewModel';
import { saveLocalDoclink } from '../services/localDoclinkStorage';
import ChooseDocumentSourceModal from '../components/ChooseDocumentSourceModal';

type AddDoclinkRouteParams = {
  ownerid?: number;
  siteid?: string;
  wonum?: string;
};

type Props = {
  route: RouteProp<Record<string, AddDoclinkRouteParams>, string>;
};

const C = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  accent: '#3d6aff',
  textSub: '#8b92b0',
  pill: 'rgba(61,106,255,0.12)',
};

function safeDocumentName(name: string) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

function getExtension(originalName?: string) {
  const raw = String(originalName || '').trim();
  const match = raw.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toUpperCase().slice(0, 4) : 'FILE';
}

function isImageFile(originalName?: string) {
  return /\.(jpg|jpeg|png|heic|webp)$/i.test(String(originalName || ''));
}

function suggestDocumentName(params: {
  originalName?: string;
  wonum?: string;
  ownerid?: number;
}) {
  const ext = getExtension(params.originalName);
  const type = isImageFile(params.originalName) ? 'IMG' : 'DOC';

  const d = new Date();
  const datePart = `${String(d.getDate()).padStart(2, '0')}${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}`;

  const woPart = params.wonum
    ? `WO${params.wonum}`
    : params.ownerid
    ? `OT${params.ownerid}`
    : 'DOC';

  let name = `${woPart}_${type}_${datePart}.${ext}`;

  if (name.length > 20) {
    name = `${type}_${datePart}.${ext}`;
  }

  return name.slice(0, 20).toUpperCase();
}

export default function AddDoclinkScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { username, password } = useAuth();

  const [sourceModalVisible, setSourceModalVisible] = useState(false);

  const ownerid = Number(route.params?.ownerid ?? 0);
  const siteid = String(route.params?.siteid ?? '');
  const wonum = String(route.params?.wonum ?? '');

  const vm = useAddDoclinkViewModel({
    ownerid,
    siteid,
    username: username ?? '',
    password: password ?? '',
    onSuccess: () => navigation.goBack(),
  });

  const permissionsVM = useWorkOrdersPermissionsViewModel(false);

  const setSelectedFile = async (params: {
    fileName: string;
    filePath: string;
  }) => {
    const safeFileName = safeDocumentName(params.fileName);
    const finalPath = `${RNFS.DocumentDirectoryPath}/${safeFileName}`;

    if (params.filePath !== finalPath) {
      await RNFS.copyFile(params.filePath, finalPath);
    }

    const base64 = await RNFS.readFile(finalPath, 'base64');

    const suggestedName = suggestDocumentName({
      originalName: safeFileName,
      wonum,
      ownerid,
    });

    vm.setDocumentName(suggestedName);
    vm.setBase64Data(base64);
    vm.setLocalPath(finalPath);

    console.log('📎 [AddDoclink] original fileName:', safeFileName);
    console.log('📎 [AddDoclink] suggested document:', suggestedName);
    console.log('📎 [AddDoclink] finalPath:', finalPath);
    console.log('📎 [AddDoclink] base64 length:', base64.length);
  };

  const pickFile = async () => {
    setSourceModalVisible(false);

    try {
      const [file] = await pick({
        mode: 'open',
        allowMultiSelection: false,
        type: [types.allFiles],
      });

      const fileName = file.name ?? `document_${Date.now()}`;

      const results = await keepLocalCopy({
        files: [
          {
            uri: file.uri,
            fileName,
          },
        ],
        destination: 'documentDirectory',
      });

      const copied = results[0];

      if (!copied) {
        Alert.alert('Erreur', 'Aucun fichier copié.');
        return;
      }

      if (copied.status !== 'success') {
        Alert.alert(
          'Erreur',
          copied.copyError || 'Impossible de copier le fichier localement.',
        );
        return;
      }

      const copiedPath =
        Platform.OS === 'android'
          ? copied.localUri.replace('file://', '')
          : decodeURIComponent(copied.localUri.replace('file://', ''));

      await setSelectedFile({
        fileName,
        filePath: copiedPath,
      });
    } catch (error: any) {
      if (isErrorWithCode(error)) return;

      console.log('❌ [AddDoclink] pickFile error:', error?.message);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier.');
    }
  };

  const openCamera = async () => {
    setSourceModalVisible(false);

    const granted = await permissionsVM.ensureCameraPermission();
    if (!granted) return;

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 1,
        maxWidth: 800,
        maxHeight: 800,
        saveToPhotos: false,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        Alert.alert(
          'Erreur',
          result.errorMessage || "Impossible d'ouvrir la caméra.",
        );
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert('Erreur', 'Image introuvable.');
        return;
      }

      const fileName =
        asset.fileName ||
        `camera_${Date.now()}.${asset.type?.includes('png') ? 'png' : 'jpg'}`;

      const imagePath =
        Platform.OS === 'android'
          ? asset.uri.replace('file://', '')
          : decodeURIComponent(asset.uri.replace('file://', ''));

      await setSelectedFile({
        fileName,
        filePath: imagePath,
      });
    } catch (error: any) {
      console.log('❌ [AddDoclink] camera error:', error?.message);
      Alert.alert('Erreur', 'Impossible de prendre une photo.');
    }
  };

  const handleSubmit = async () => {
    if (vm.documentName.length > 20) {
      vm.setMessage('Le nom du document ne doit pas dépasser 20 caractères.');
      return;
    }

    const selectedName = vm.documentName;
    const selectedDescription = vm.description;
    const selectedLocalPath = vm.localPath;

    const ok = await vm.addDocument();

    if (!ok) return;

    if (selectedLocalPath && selectedName) {
      await saveLocalDoclink({
        ownerid,
        documentName: selectedName,
        description: selectedDescription,
        localPath: selectedLocalPath,
      });
    }

    vm.resetForm();
  };

  return (
    <>
      <AddEntityScreenLayout
        title="Document"
        badgeText={ownerid ? `OT #${ownerid}` : undefined}
        badgeSecondaryText={siteid || undefined}
        submitTitle="Enregistrer"
        submitIcon="check"
        onSubmit={handleSubmit}
        submitLoading={vm.loading}
        submitDisabled={vm.loading}
        onCancel={() => navigation.goBack()}
        successVisible={vm.successVisible}
        successTitle={vm.successTitle}
        successMessage={vm.successMessage}
        onCloseSuccess={vm.closeSuccess}
        errorVisible={!!vm.message}
        errorTitle="Erreur"
        errorMessage={vm.message}
        onCloseError={() => vm.setMessage('')}
      >
        <View style={styles.card}>
          <SectionLabel icon="paperclip" title="Fichier" />

          <TouchableOpacity
            style={styles.fileButton}
            onPress={() => setSourceModalVisible(true)}
            activeOpacity={0.88}
          >
            <View
              style={[
                styles.pillIcon,
                vm.base64Data ? styles.pillIconActive : null,
              ]}
            >
              <FeatherIcon
                name={vm.base64Data ? 'check' : 'upload'}
                size={14}
                color={vm.base64Data ? C.accent : C.textSub}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.fileTitle}>
                {vm.base64Data ? 'Fichier sélectionné' : 'Choisir ou capturer'}
              </Text>
              <Text style={styles.fileSubtitle}>
                {vm.documentName || 'Photo caméra, PDF, Word, Excel...'}
              </Text>
            </View>

            <FeatherIcon name="chevron-right" size={18} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <SectionLabel icon="file-text" title="Informations" />

          <FormField label="Nom du document" required>
            <AppInput
              icon="type"
              value={vm.documentName}
              onChangeText={text => {
                const clean = safeDocumentName(text).toUpperCase();

                if (clean.length <= 20) {
                  vm.setDocumentName(clean);
                } else {
                  vm.setMessage(
                    'Le nom du document ne doit pas dépasser 20 caractères.',
                  );
                }
              }}
              autoCapitalize="characters"
              returnKeyType="next"
            />
          </FormField>

          <Text style={styles.lengthHint}>
            {vm.documentName.length}/20 caractères maximum
          </Text>

          <FormField label="Description">
            <View style={styles.textAreaWrap}>
              <TextInput
                value={vm.description}
                onChangeText={vm.setDescription}
                placeholderTextColor={C.textSub}
                style={styles.textArea}
                multiline
                textAlignVertical="top"
              />
            </View>
          </FormField>
        </View>
      </AddEntityScreenLayout>

      <ChooseDocumentSourceModal
        visible={sourceModalVisible}
        onCamera={openCamera}
        onFile={pickFile}
        onCancel={() => setSourceModalVisible(false)}
      />

      <AppPermissionsModal
        visible={permissionsVM.visible}
        mode={permissionsVM.mode}
        blockedCamera={permissionsVM.blockedCamera}
        blockedMicrophone={permissionsVM.blockedMicrophone}
        onConfirm={permissionsVM.confirmSelection}
        onLater={permissionsVM.closeModal}
      />
    </>
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
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderAlt,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  fileTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  fileSubtitle: {
    marginTop: 3,
    color: C.textSub,
    fontSize: 12,
    fontWeight: '600',
  },
  pillIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconActive: {
    backgroundColor: C.pill,
  },
  lengthHint: {
    marginTop: -6,
    marginBottom: 10,
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  textAreaWrap: {
    borderWidth: 1,
    borderColor: C.borderAlt,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 110,
    color: '#fff',
    fontSize: 14,
  },
});