import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import WorkOrderCategoryCard from './WorkOrderCategoryCard';
import WorkOrderCategoryListRow from './WorkOrderCategoryListRow';
import { colors } from '../../../shared/theme/colors';

type SectionItem = {
  key: string;
  icon: string;
  gradient: readonly string[];
};

type Section = {
  title: string;
  items: readonly SectionItem[];
};

type Props = {
  sections: readonly Section[];
  getCategoryCount: (category: string) => number;
  onCategoryPress: (category: string) => void;
  onPlusPress: (category: string) => void;
  isAddDisabled?: (key: string) => boolean;
  cardWidth: number;
  cardHeight: number;
  gap: number;
};

type ViewMode = 'grid' | 'list';

const categoryIcons: Record<string, ImageSourcePropType> = {
  Activités: require('../../../assets/icons/liste-a-puces.png'),
  "Main d'œuvre planifiée": require('../../../assets/icons/groupe.png'),
  'Matériel planifié': require('../../../assets/icons/materiel-de-reparation.png'),
  "Main d'œuvre réelle": require('../../../assets/icons/la-main-doeuvre.png'),
  'Matériel réel': require('../../../assets/icons/verification-de-lutilisateur.png'),
  Documents: require('../../../assets/icons/google-docs.png'),
  'Work log': require('../../../assets/icons/time-and-date.png'),
  "Détails de l'échec": require('../../../assets/icons/attention.png'),
  'Ordres de travail liés': require('../../../assets/icons/lien.png'),
};

const fallbackIcon = require('../../../assets/icons/liste-a-puces.png');

const PLUS_ENABLED_KEYS = new Set([
  "Main d'œuvre réelle",
  'Matériel réel',
  "Main d'œuvre planifiée",
  'Matériel planifié',
  'Documents',
  'Work log',
  "Détails de l'échec",
  'Ordres de travail liés',
]);

export default function WorkOrderSectionGrid({
  sections,
  getCategoryCount,
  onCategoryPress,
  onPlusPress,
  isAddDisabled,
  cardWidth,
  cardHeight,
  gap,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const allCategories = sections.flatMap(section => section.items);

  return (
    <View>
      {/* Header: label + toggle */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>CATÉGORIES</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              styles.toggleLeft,
              viewMode === 'list' && styles.toggleActive,
            ]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.75}
          >
            <FeatherIcon
              name="list"
              size={15}
              color={viewMode === 'list' ? colors.white : colors.textSub}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              styles.toggleRight,
              viewMode === 'grid' && styles.toggleActive,
            ]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.75}
          >
            <FeatherIcon
              name="grid"
              size={15}
              color={viewMode === 'grid' ? colors.white : colors.textSub}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <View style={[styles.gridContainer, { columnGap: gap, rowGap: gap }]}>
          {allCategories.map(category => {
            const disabled = isAddDisabled?.(category.key) ?? false;
            const icon = categoryIcons[category.key] ?? fallbackIcon;

            return (
              <WorkOrderCategoryCard
                key={category.key}
                title={category.key}
                icon={icon}
                count={getCategoryCount(category.key)}
                width={cardWidth}
                height={cardHeight}
                showPlus={PLUS_ENABLED_KEYS.has(category.key)}
                plusDisabled={disabled}
                onPress={() => onCategoryPress(category.key)}
                onPlusPress={() => onPlusPress(category.key)}
              />
            );
          })}
        </View>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <View style={styles.listContainer}>
          {allCategories.map(category => {
            const disabled = isAddDisabled?.(category.key) ?? false;
            const icon = categoryIcons[category.key] ?? fallbackIcon;

            return (
              <WorkOrderCategoryListRow
                key={category.key}
                title={category.key}
                icon={icon}
                count={getCategoryCount(category.key)}
                showPlus={PLUS_ENABLED_KEYS.has(category.key)}
                plusDisabled={disabled}
                onPress={() => onCategoryPress(category.key)}
                onPlusPress={() => onPlusPress(category.key)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
    letterSpacing: 1.2,
  },

  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  toggleButton: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  toggleRight: {},
  toggleActive: {
    backgroundColor: colors.primary,
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  listContainer: {
    gap: 8,
  },
});
