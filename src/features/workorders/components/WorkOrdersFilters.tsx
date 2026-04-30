import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppText from '../../../shared/components/typography/AppText';

type Props = {
  search: string;
  setSearch: (value: string) => void;
  activeFilter: string;
  setActiveFilter: (value: string) => void;
  selectedDate?: Date | null;
  onOpenScanner: () => void;
  onResetCalendarFilter: () => void;
  onResetBarcodeFilter: () => void;
  onClearSearchSideEffects: () => void;
};

const FILTERS = [
  { key: 'Tous', icon: 'grid' },
  { key: "Aujourd'hui", icon: 'calendar' },
  { key: 'À venir', icon: 'clock' },
  { key: 'Urgent', icon: 'alert-circle' },
  { key: 'Terminés', icon: 'check-circle' },
];

export default function WorkOrdersFilters({
  search,
  setSearch,
  activeFilter,
  setActiveFilter,
  selectedDate,
  onOpenScanner,
  onResetCalendarFilter,
  onResetBarcodeFilter,
  onClearSearchSideEffects,
}: Props) {
  const onSelectFilter = (key: string) => {
    setActiveFilter(key);
    setSearch('');
    onResetBarcodeFilter();

    if (key !== "Aujourd'hui") {
      onResetCalendarFilter();
    }

    onClearSearchSideEffects();
  };

  return (
    <View style={styles.wrapper}>
      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <FeatherIcon name="search" size={16} color="#475569" />
          <TextInput
            placeholder="Rechercher..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#475569"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <FeatherIcon name="x" size={15} color="#475569" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={onOpenScanner}
          style={styles.scanButton}
          activeOpacity={0.8}
        >
          <MaterialIcon name="qrcode-scan" size={20} color="#60a5fa" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map(filter => {
        const active = !selectedDate && activeFilter === filter.key;

        return (
          <TouchableOpacity
            key={filter.key}
            onPress={() => onSelectFilter(filter.key)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.8}
          >
            <FeatherIcon
              name={filter.icon as any}
              size={13}
              color={active ? '#fff' : '#64748b'}
            />
            <AppText style={[styles.chipText, active && styles.chipTextActive]}>
              {filter.key}
            </AppText>
          </TouchableOpacity>
        );
      })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#0a0f1e',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '500',
  },
  scanButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.25)',
  },
  filtersRow: {
    paddingRight: 8,
  },
  chip: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#fff',
  },
});