import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WorkOrderCategoryCard from './WorkOrderCategoryCard';

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

export default function WorkOrderSectionGrid({
  sections,
  getCategoryCount,
  onCategoryPress,
  onPlusPress,
  cardWidth,
  cardHeight,
  gap,
}: Props) {
  return (
    <>
      {sections.map(section => (
        <View key={section.title} style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionDivider} />
          </View>

          <View style={[styles.categoryGrid, { columnGap: gap, rowGap: gap }]}>
            {section.items.map(category => {
              const showPlus =
                category.key === "Main d'œuvre réelle" ||
                category.key === 'Matériel réel' ||
                category.key === "Main d'œuvre planifiée" ||
                category.key === 'Matériel planifié' ||
                category.key === 'Documents' ||
                category.key === 'Work log' ||
                category.key === "Détails de l'échec" ||
                category.key === 'Ordres de travail liés';

              return (
                <WorkOrderCategoryCard
                  key={category.key}
                  title={category.key}
                  icon={category.icon}
                  gradient={[...category.gradient]}
                  count={getCategoryCount(category.key)}
                  width={cardWidth}
                  height={cardHeight}
                  showPlus={showPlus}
                  onPress={() => onCategoryPress(category.key)}
                  onPlusPress={() => onPlusPress(category.key)}
                />
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});