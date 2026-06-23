import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

type Props = {
  loading?: boolean;
  onPress: () => void;
};

const C = {
  surfaceAlt: '#181c27',
  borderAlt: '#252938',
  green: '#22c55e',
  text: '#f8fafc',
  textSub: '#8b92b0',
};

export default function AddWorkOrderAIHeader({ loading, onPress }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Assistant IA</Text>
        <Text style={styles.subtitle}>
          Écrire ou dicter une demande pour préremplir l’ordre de travail
        </Text>
      </View>

      <TouchableOpacity
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.88}
        style={[styles.button, loading && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <FeatherIcon name="cpu" size={17} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderAlt,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: C.text,
    fontSize: 14,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 3,
    color: C.textSub,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
});