import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

type Props = {
  title: string;
  onPress: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
};

const C = {
  accent: '#3d6aff',
  white: '#ffffff',
};

export default function FormSubmitButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon = 'check',
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[styles.button, isDisabled && styles.buttonDisabled]}
    >
      {loading ? (
        <ActivityIndicator color={C.white} />
      ) : (
        <View style={styles.content}>
          <FeatherIcon name={icon as any} size={16} color={C.white} />
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
  },
});