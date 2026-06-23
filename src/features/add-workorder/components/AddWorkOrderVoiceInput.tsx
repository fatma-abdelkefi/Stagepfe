import React from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  recording: boolean;
  loading: boolean;
  info?: string;
  error?: boolean;
  minHeight?: number;
  onChangeText: (value: string) => void;
  onVoicePress: () => void;
};

const C = {
  accent: '#3d6aff',
  successText: '#86efac',
  errorText: '#fca5a5',
  recordRed: '#ef4444',
  textSub: '#94a3b8',
};

export default function AddWorkOrderVoiceInput({
  label,
  value,
  placeholder,
  recording,
  loading,
  info,
  error,
  minHeight = 100,
  onChangeText,
  onVoicePress,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          multiline
          placeholder={placeholder}
          placeholderTextColor="#64748b"
          textAlignVertical="top"
          style={[
            styles.input,
            {
              minHeight,
              paddingRight: 54,
            },
          ]}
        />

        {recording ? <View style={styles.micPulse} /> : null}

        <TouchableOpacity
          onPress={onVoicePress}
          disabled={loading}
          activeOpacity={0.85}
          style={[
            styles.micButton,
            recording && styles.micButtonActive,
            loading && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FeatherIcon
              name={recording ? 'square' : 'mic'}
              size={18}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>

      {info ? (
        <View style={styles.infoBox}>
          <FeatherIcon
            name={error ? 'x-circle' : 'check-circle'}
            size={14}
            color={error ? C.errorText : C.successText}
          />

          <Text style={[styles.infoText, error && styles.infoTextError]}>
            {info}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  label: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    color: '#f8fafc',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  micButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
  },
  micButtonActive: {
    backgroundColor: C.recordRed,
  },
  disabled: {
    opacity: 0.6,
  },
  micPulse: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  infoBox: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
    color: C.successText,
    fontSize: 12,
    fontWeight: '600',
  },
  infoTextError: {
    color: C.errorText,
  },
});