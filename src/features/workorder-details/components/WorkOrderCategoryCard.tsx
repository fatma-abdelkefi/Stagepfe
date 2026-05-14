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
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Image source={icon} style={styles.iconImage} resizeMode="contain" />
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
              size={15}
              color={plusDisabled ? '#566079' : '#8f9ab8'}
            />
          </Pressable>
        )}
      </View>

      <View>
        <Text style={styles.countText}>{count}</Text>

        <Text style={styles.name} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.decorCircle} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111522',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#202639',
    padding: 14,
    justifyContent: 'space-between',
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1a2033',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 22,
    height: 22,
  },
  plusButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#1a2033',
    borderWidth: 1,
    borderColor: '#27304a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 6,
  },
  plusButtonDisabled: {
    opacity: 0.45,
  },
  countText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 2,
  },
  name: {
    fontSize: 12,
    color: '#405081',
    fontWeight: '700',
  },
  decorCircle: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    right: -28,
    bottom: -26,
    backgroundColor: 'rgba(109, 92, 255, 0.14)',
  },
});