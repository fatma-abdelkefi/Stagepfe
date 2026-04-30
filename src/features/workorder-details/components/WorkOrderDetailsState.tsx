import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  type: 'loading' | 'error';
  message?: string;
  onRetry?: () => void;
};

export default function WorkOrderDetailsState({ type, message, onRetry }: Props) {
  if (type === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconWrap}>
        <FeatherIcon name="alert-circle" size={48} color="#f87171" />
      </View>
      <Text style={styles.errorMessage}>{message || 'Aucune donnée disponible'}</Text>

      {!!onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.retryButtonGradient}
          >
            <FeatherIcon name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0f1e',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0a0f1e',
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});