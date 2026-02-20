import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Colors } from './theme';

type Props = TextProps & {
  muted?: boolean;
  bold?: boolean;
};

export function AppText({ style, muted, bold, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        muted && styles.muted,
        bold && styles.bold,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: Colors.text },
  muted: { color: Colors.muted },
  bold: { fontWeight: '700' },
});
