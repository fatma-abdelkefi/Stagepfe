import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Image,
  ImageSourcePropType,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { colors } from '../../../shared/theme/colors';

type Props = {
  title: string;
  icon: ImageSourcePropType;
  count: number;
  width: number;
  height: number;
  showPlus?: boolean;
  plusDisabled?: boolean;
  onPress: () => void;
  onPlusPress?: () => void;
};

export default function WorkOrderCategoryCard({
  title,
  icon,
  count,
  width,
  height,
  showPlus = false,
  plusDisabled = false,
  onPress,
  onPlusPress,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, { width, height }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* Top row: icon + plus button */}
      <View style={styles.topRow}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            <Image source={icon} style={styles.iconImage} resizeMode="contain" />
          </View>
        </View>

        {showPlus && !!onPlusPress && (
          <Pressable
            disabled={plusDisabled}
            onPress={e => {
              e.stopPropagation();
              onPlusPress();
            }}
            style={[
              styles.plusButton,
              plusDisabled && styles.plusButtonDisabled,
            ]}
          >
            <FeatherIcon
              name="plus"
              size={14}
              color={plusDisabled ? colors.mutedText : colors.primary}
            />
          </Pressable>
        )}
      </View>

      {/* Bottom: count + label */}
      <View style={styles.bottomContent}>
        <Text style={styles.countText}>{count}</Text>
        <Text style={styles.labelText} numberOfLines={2}>
          {title}
        </Text>
      </View>

      {/* Decorative corner */}
      <View style={styles.decorCircle} />
      <View style={styles.decorCircleSmall} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',

    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  iconWrapper: {
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    padding: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },

  plusButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 2,
  },
  plusButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    opacity: 0.6,
  },

  bottomContent: {
    gap: 2,
  },
  countText: {
    fontSize: 26,
    color: colors.text,
    fontWeight: '800',
    lineHeight: 30,
  },
  labelText: {
    fontSize: 11,
    color: colors.textSub,
    fontWeight: '600',
    lineHeight: 14,
  },

  decorCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    right: -30,
    bottom: -30,
    backgroundColor: '#dbeafe',
    opacity: 0.5,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    right: 20,
    bottom: -16,
    backgroundColor: '#bfdbfe',
    opacity: 0.4,
  },
});
