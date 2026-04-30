import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  title: string;
  icon: string;
  gradient: readonly string[];
  count: number;
  width: number;
  height: number;
  showPlus?: boolean;
  onPress: () => void;
  onPlusPress?: () => void;
};

export default function WorkOrderCategoryCard({
  title,
  icon,
  gradient,
  count,
  width,
  height,
  showPlus = false,
  onPress,
  onPlusPress,
}: Props) {
  return (
    <View style={[styles.cardWrap, { width, height }]}>
      <TouchableOpacity style={styles.cardTouch} activeOpacity={0.8} onPress={onPress}>
        <LinearGradient
          colors={gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View>
            <View style={styles.iconContainer}>
              <FeatherIcon name={icon as any} size={22} color="#fff" />
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {title}
            </Text>
          </View>

          <View style={styles.count}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {showPlus && !!onPlusPress && (
        <TouchableOpacity onPress={onPlusPress} style={styles.plusButton} activeOpacity={0.9}>
          <FeatherIcon name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 18,
    overflow: 'visible',
    position: 'relative',
  },
  cardTouch: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  gradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  plusButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 6,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
    paddingRight: 22,
    lineHeight: 15,
  },
  count: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    minWidth: 26,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
});