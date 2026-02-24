import React from 'react';
import { View, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { AppText } from '../AppText';
import { detailsStyles } from './detailsStyles';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  backgroundColor?: string;
};

export default function DetailsHeader({ title, subtitle, right, backgroundColor }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const bg = backgroundColor || '#3b82f6';

  return (
    <View style={[detailsStyles.header, { backgroundColor: bg, paddingTop: insets.top + 12 }]}>
      <StatusBar barStyle="light-content" backgroundColor={bg} translucent={false} />

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={detailsStyles.backButton}
        activeOpacity={0.85}
      >
        <FeatherIcon name="arrow-left" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={{ flex: 1, alignItems: 'center' }}>
        <AppText style={detailsStyles.headerTitle} numberOfLines={1}>
          {title}
        </AppText>

        {!!subtitle && (
          <AppText style={detailsStyles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>

      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>
        {right ? right : <View style={detailsStyles.headerSpacer} />}
      </View>
    </View>
  );
}