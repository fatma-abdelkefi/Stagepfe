import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { detailsStyles } from './detailsStyles';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function DetailsCard({ children, style }: Props) {
  return <View style={[detailsStyles.card, style]}>{children}</View>;
}