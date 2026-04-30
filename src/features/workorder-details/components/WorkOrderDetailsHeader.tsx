import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

type Props = {
  title?: string;
  sidePadding: number;
  onBack: () => void;
  children: React.ReactNode;
};

export default function WorkOrderDetailsHeader({
  title = 'Détails OT',
  sidePadding,
  onBack,
  children,
}: Props) {
  return (
    <LinearGradient
      colors={['#1e3a5f', '#1a2e4a', '#0f1e35']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.header,
        {
          paddingHorizontal: sidePadding,
          paddingTop: Platform.OS === 'android' ? 6 : 8,
        },
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <FeatherIcon name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{title}</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerRightSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: 0.3,
  },
});