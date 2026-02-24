import React from 'react';
import { View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { AppText } from '../AppText';
import { detailsStyles } from './detailsStyles';

type Props = {
  text: string;
};

export default function DetailsEmptyState({ text }: Props) {
  return (
    <View style={detailsStyles.emptyContainer}>
      <FeatherIcon name="inbox" size={64} color="#cbd5e1" />
      <AppText style={detailsStyles.emptyText}>{text}</AppText>
    </View>
  );
}