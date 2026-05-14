import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  ImageSourcePropType,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

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

export default function WorkOrderSectionGrid({
  sections,
  getCategoryCount,
  onCategoryPress,
  onPlusPress,
  isAddDisabled,
}: Props) {
  const allCategories = sections.flatMap(section => section.items);

  const canShowPlus = (key: string) =>
    key === "Main d'œuvre réelle" ||
    key === 'Matériel réel' ||
    key === "Main d'œuvre planifiée" ||
    key === 'Matériel planifié' ||
    key === 'Documents' ||
    key === 'Work log' ||
    key === "Détails de l'échec" ||
    key === 'Ordres de travail liés';

  const getIconColor = (key: string) => {
    switch (key) {
      case 'Activités':
        return '#7c3aed';
      case "Main d'œuvre planifiée":
        return '#16a34a';
      case 'Matériel planifié':
        return '#f59e0b';
      case "Main d'œuvre réelle":
        return '#d946ef';
      case 'Matériel réel':
        return '#22c55e';
      case 'Documents':
        return '#ef4444';
      case 'Work log':
        return '#65a30d';
      case "Détails de l'échec":
        return '#f97316';
      case 'Ordres de travail liés':
        return '#2563eb';
      default:
        return '#6366f1';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>CATÉGORIES</Text>

      {allCategories.map(category => {
        const color = getIconColor(category.key);
        const disabled = isAddDisabled?.(category.key) ?? false;
        const showPlus = canShowPlus(category.key);
        const source = categoryIcons[category.key] ?? fallbackIcon;

        return (
          <TouchableOpacity
            key={category.key}
            activeOpacity={0.85}
            onPress={() => onCategoryPress(category.key)}
            style={styles.row}
          >
            <View style={styles.left}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: `${color}18` },
                ]}
              >
                <Image
                  source={source}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.title} numberOfLines={1}>
                {category.key}
              </Text>
            </View>

            <View style={styles.right}>
              {showPlus && (
                <Pressable
                  disabled={disabled}
                  onPress={e => {
                    e.stopPropagation();
                    onPlusPress(category.key);
                  }}
                  style={[
                    styles.plusButton,
                    disabled && styles.plusButtonDisabled,
                  ]}
                >
                  <FeatherIcon
                    name="plus"
                    size={15}
                    color={disabled ? '#b8b2a8' : '#3b79b3'}
                  />
                </Pressable>
              )}

              <Text style={styles.count}>
                {getCategoryCount(category.key)}
              </Text>

              <FeatherIcon
                name="chevron-right"
                size={18}
                color="#c4beb4"
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#aaa59b',
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    minHeight: 54,
    backgroundColor: '#97b5e0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3b79b3',
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  iconImage: {
    width: 18,
    height: 18,
  },
  title: {
    flex: 1,
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plusButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#d3d3d3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  plusButtonDisabled: {
    backgroundColor: '#d3d3d3',
  },
  count: {
    minWidth: 18,
    textAlign: 'right',
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 7,
  },
});