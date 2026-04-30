import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  StyleProp,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LD } from './ListDetailsTheme';

type Props = {
  title: string;
  subtitle?: string;
  badgeText?: string;
  onBack: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function ListDetailsLayout({
  title,
  subtitle,
  badgeText,
  onBack,
  children,
  scroll = true,
  contentContainerStyle,
}: Props) {
  const body = (
    <View style={[styles.content, !scroll && styles.contentNoScroll, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <FeatherIcon name="arrow-left" size={20} color={LD.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {!!badgeText ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        ) : (
          <View style={{ width: 42 }} />
        )}
      </View>

      {scroll ? (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={styles.noScrollWrapper}>
          {body}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LD.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: LD.border,
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: LD.surfaceAlt,
    borderWidth: 1,
    borderColor: LD.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: LD.text,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: LD.textSub,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: LD.accentSoft,
    borderWidth: 1,
    borderColor: LD.accentBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: LD.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  noScrollWrapper: {
    flex: 1,
    paddingBottom: 1,
  },
  content: {
    padding: 16,
  },
  contentNoScroll: {
    flex: 1,
  },
});