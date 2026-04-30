import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { useAuth } from '../../../app/providers/AuthProvider';
import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import ErrorModal from '../../../shared/components/feedback/ErrorModal';

import { downloadAndOpenDoclink } from '../services/attachmentsService';
import { findLocalDoclink } from '../services/localDoclinkStorage';

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function getDocName(item: any): string {
  return (
    safeStr(item?.document) ||
    safeStr(item?.description) ||
    safeStr(item?.docinfo?.document) ||
    'Sans nom'
  );
}

function getDescription(item: any): string {
  return (
    safeStr(item?.description) ||
    safeStr(item?.docinfo?.description) ||
    'Aucune description'
  );
}

function isImagePath(path: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(path);
}

export default function DoclinkDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { username, password } = useAuth();

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const document = route.params?.document;

  const docName = useMemo(() => getDocName(document), [document]);
  const description = useMemo(() => getDescription(document), [document]);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const handleOpen = async () => {
    if (!username || !password) {
      showError('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    const localPath = await findLocalDoclink({
      ownerid: document?.ownerid,
      documentName: docName,
      description: document?.description,
    });

    if (localPath && isImagePath(localPath)) {
      navigation.navigate('LocalDoclinkImageViewer', {
        uri: `file://${localPath}`,
        title: docName,
      });
      return;
    }

    const ok = await downloadAndOpenDoclink(
      document,
      username,
      password,
      docName,
    );

    if (!ok) {
      showError(
        'Ce document ne peut pas être ouvert. Il peut être lié à une adresse interne Maximo non accessible.',
      );
    }
  };

  return (
    <>
      <ListDetailsLayout
        title="Détails du document"
        subtitle={docName}
        onBack={() => navigation.goBack()}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerBox}>
            <View style={styles.iconBox}>
              <FeatherIcon name="file-text" size={30} color="#3d6aff" />
            </View>

            <Text style={styles.docTitle}>{docName}</Text>
            <Text style={styles.docSubtitle}>Document attaché</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <FeatherIcon name="type" size={16} color="#3d6aff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Nom du document</Text>
                  <Text style={styles.value}>{docName}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <FeatherIcon name="align-left" size={16} color="#3d6aff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Description</Text>
                  <Text style={styles.value}>{description}</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleOpen}
            style={styles.openButton}
          >
            <FeatherIcon name="external-link" size={18} color="#fff" />
            <Text style={styles.openButtonText}>Ouvrir le document</Text>
          </TouchableOpacity>
        </ScrollView>
      </ListDetailsLayout>

      <ErrorModal
        visible={errorVisible}
        title="Erreur"
        message={errorMessage}
        onClose={() => setErrorVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },

  headerBox: {
    alignItems: 'center',
    paddingVertical: 22,
  },

  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(61,106,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(61,106,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  docTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },

  docSubtitle: {
    marginTop: 5,
    color: '#8b92b0',
    fontSize: 13,
    fontWeight: '700',
  },

  section: {
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: '#111520',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2235',
    padding: 14,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(61,106,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    color: '#8b92b0',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 5,
  },

  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },

  divider: {
    height: 1,
    backgroundColor: '#1e2235',
    marginVertical: 14,
  },

  openButton: {
    marginTop: 22,
    backgroundColor: '#3d6aff',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  openButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});