import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { createWorklog, extractText } from '../services/nlpApi';

export default function NlpWorklogScreen() {
  const [text, setText] = useState('');
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExtract = async () => {
    try {
      setLoadingExtract(true);
      const res = await extractText(text);
      setResult(res);
    } catch (error: any) {
      Alert.alert('Erreur NLP', error.message || 'Erreur inconnue');
    } finally {
      setLoadingExtract(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoadingCreate(true);
      const res = await createWorklog(text);
      setResult(res);

      if (res.success) {
        Alert.alert('Succès', `Worklog créé pour WO ${res.wonum}`);
      } else {
        Alert.alert('Échec', res.message || 'Création impossible');
      }
    } catch (error: any) {
      Alert.alert('Erreur création', error.message || 'Erreur inconnue');
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>NLP Worklog</Text>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Ex: wo 1200 moteur bloqué remplacé puis test de fonctionnement ok"
        value={text}
        onChangeText={setText}
      />

      <TouchableOpacity style={styles.button} onPress={handleExtract} disabled={loadingExtract}>
        {loadingExtract ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Analyser</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleCreate} disabled={loadingCreate}>
        {loadingCreate ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Créer Worklog</Text>}
      </TouchableOpacity>

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.sectionTitle}>Résultat</Text>
          <Text selectable style={styles.jsonText}>
            {JSON.stringify(result, null, 2)}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8fafc',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#0f172a',
  },
  input: {
    minHeight: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: '#0f766e',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultBox: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  jsonText: {
    fontSize: 13,
    color: '#334155',
  },
});