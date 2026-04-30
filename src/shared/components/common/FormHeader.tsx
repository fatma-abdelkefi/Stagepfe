import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  rightIcon?: string;
  onRightPress?: () => void;
};

export default function FormHeader({
  title,
  subtitle,
  rightIcon,
  onRightPress,
}: Props) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Back */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <FeatherIcon name="arrow-left" size={18} color={colors.text} />
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Right action */}
      {rightIcon ? (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onRightPress}
          activeOpacity={0.7}
        >
          <FeatherIcon name={rightIcon} size={18} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.mutedText,
  },
});