import React from 'react';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from './theme';

type Props = {
  name: React.ComponentProps<typeof Feather>['name'];
  size?: number;
  color?: string;
};

export function AppIcon({ name, size = 20, color = Colors.text }: Props) {
  return <Feather name={name} size={size} color={color} />;
}
