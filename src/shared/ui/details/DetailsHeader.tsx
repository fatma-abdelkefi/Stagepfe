import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';

type Props = {
  title: string;
  subtitle?: string;
};

export default function DetailsHeader({ title, subtitle }: Props) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <FeatherIcon name="arrow-left" size={20} color="#0f172a" />
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.backButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
});