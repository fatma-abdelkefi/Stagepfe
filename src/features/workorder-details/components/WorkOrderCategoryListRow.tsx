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
  showPlus?: boolean;
  plusDisabled?: boolean;
  onPress: () => void;
  onPlusPress?: () => void;
};

export default function WorkOrderCategoryListRow({
  title,
  icon,
  count,
  showPlus = false,
  plusDisabled = false,
  onPress,
  onPlusPress,
}: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.75}
      onPress={onPress}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Image source={icon} style={styles.iconImage} resizeMode="contain" />
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right side: plus + count + arrow */}
      <View style={styles.rightSide}>
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
              size={13}
              color={plusDisabled ? colors.mutedText : colors.primary}
            />
          </Pressable>
        )}

        <View style={[styles.countBadge, count === 0 && styles.countBadgeEmpty]}>
          <Text style={[styles.countText, count === 0 && styles.countTextEmpty]}>
            {count}
          </Text>
        </View>

        <FeatherIcon name="chevron-right" size={16} color={colors.mutedText} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconImage: {
    width: 18,
    height: 18,
    tintColor: colors.white,
  },

  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  },
  plusButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    opacity: 0.55,
  },

  countBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  countBadgeEmpty: {
    backgroundColor: colors.surfaceAlt,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  countTextEmpty: {
    color: colors.mutedText,
  },
});
