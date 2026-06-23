import React, { useMemo } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { colors } from '../../../shared/theme/colors';

type Props = {
  label: string;
  value?: string | number | null;
  icon?: string;
  required?: boolean;
  autoHeight?: boolean;
  minHeight?: number;
  maxHeight?: number;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onChangeText: (value: string) => void;
};

const UI = {
  input: '#1b1f2a',
  border: '#252938',
  text: '#f8fafc',
  sub: '#9ca3b8',
  disabled: '#151923',
};

const BASE_HEIGHT = 42;
const FONT_SIZE = 13;
const LINE_HEIGHT = 18;

function getAutoHeight(
  value?: string | number | null,
  minHeight = BASE_HEIGHT,
  maxHeight = 110,
) {
  const text = String(value ?? '');

  if (!text.trim()) {
    return minHeight;
  }

  const charsPerLine = 34;
  const explicitLines = text.split('\n').length;
  const estimatedLines = Math.ceil(text.length / charsPerLine);
  const lines = Math.max(1, explicitLines, estimatedLines);

  const height = minHeight + (lines - 1) * LINE_HEIGHT;

  return Math.min(maxHeight, Math.max(minHeight, height));
}

export default function AddWorkOrderField({
  label,
  value,
  icon,
  required = false,
  autoHeight = false,
  minHeight = BASE_HEIGHT,
  maxHeight = 110,
  keyboardType = 'default',
  editable = true,
  autoCapitalize = 'sentences',
  onChangeText,
}: Props) {
  const stringValue = String(value ?? '');

  const height = useMemo(() => {
    if (!autoHeight) return minHeight;
    return getAutoHeight(stringValue, minHeight, maxHeight);
  }, [autoHeight, maxHeight, minHeight, stringValue]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <View
        style={[
          styles.inputBox,
          {
            minHeight: height,
            height,
            backgroundColor: editable ? UI.input : UI.disabled,
          },
        ]}
      >
        {icon ? (
          <FeatherIcon
            name={icon as any}
            size={16}
            color={UI.sub}
            style={styles.icon}
          />
        ) : null}

        <TextInput
          value={stringValue}
          onChangeText={onChangeText}
          editable={editable}
          multiline={autoHeight}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder=""
          placeholderTextColor={UI.sub}
          scrollEnabled={false}
          textAlignVertical={autoHeight ? 'top' : 'center'}
          style={[
            styles.input,
            autoHeight && styles.multilineInput,
            !icon && styles.inputWithoutIcon,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },

  label: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },

  required: {
    color: colors.danger,
  },

  inputBox: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    color: UI.text,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontWeight: '500',
    paddingVertical: 0,
    includeFontPadding: false,
  },

  multilineInput: {
    paddingTop: 10,
    paddingBottom: 7,
  },

  inputWithoutIcon: {
    paddingLeft: 0,
  },
});