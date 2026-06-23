import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { colors } from '../../../shared/theme/colors';

type Props<T> = {
  label: string;
  icon?: string;
  value: string;
  onChangeText: (value: string) => void;
  search: (query: string) => Promise<T[]>;
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
  getSubLabel?: (item: T) => string;
  onSelect: (item: T) => void;
  keyboardType?: 'default' | 'numeric';
};

const UI = {
  input: '#1b1f2a',
  surface: '#111520',
  dropdown: '#f8fafc',
  dropdownText: '#0f172a',
  dropdownSub: '#64748b',
  dropdownBorder: '#e2e8f0',
  optionHover: '#f1f5f9',
  border: '#252938',
  text: '#f8fafc',
  sub: '#9ca3b8',
};

export default function SuggestionInput<T>({
  label,
  icon,
  value,
  onChangeText,
  search,
  getLabel,
  getValue,
  getSubLabel,
  onSelect,
  keyboardType = 'default',
}: Props<T>) {
  const [displayValue, setDisplayValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    setDisplayValue(value || '');
  }, [value]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function run() {
      try {
        setLoading(true);

        const result = await search(displayValue || '');

        if (mounted) {
          setItems((result || []).slice(0, 6));
        }
      } catch {
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(run, 200);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [open, displayValue, search]);

  const handleChange = (text: string) => {
    setDisplayValue(text);
    onChangeText(text);
    setOpen(true);
  };

  const handleSelect = (item: T) => {
    const nextValue = getValue(item);

    setDisplayValue(nextValue);
    onChangeText(nextValue);
    onSelect(item);

    setOpen(false);
    setItems([]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.inputWrap,
          open && styles.inputWrapOpen,
        ]}
      >
        {icon ? (
          <FeatherIcon name={icon as any} size={16} color={UI.sub} />
        ) : null}

        <TextInput
          value={displayValue}
          onChangeText={handleChange}
          onFocus={() => setOpen(true)}
          keyboardType={keyboardType}
          style={styles.input}
          placeholder=""
          placeholderTextColor={UI.sub}
        />

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <FeatherIcon
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={UI.sub}
          />
        )}
      </Pressable>

      {open && items.length > 0 ? (
        <View style={styles.dropdown}>
          {items.map((item, index) => (
            <Pressable
              key={String(index)}
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
              ]}
            >
              <Text style={styles.optionText} numberOfLines={2}>
                {getLabel(item)}
              </Text>

              {getSubLabel ? (
                <Text style={styles.optionSub} numberOfLines={1}>
                  {getSubLabel(item)}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    marginBottom: 8,
    zIndex: 50,
  },

  label: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },

  inputWrap: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: UI.input,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  inputWrapOpen: {
    borderColor: colors.primary,
  },

  input: {
    flex: 1,
    color: UI.text,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },

  dropdown: {
    marginTop: 5,
    backgroundColor: UI.dropdown,
    borderWidth: 1,
    borderColor: UI.dropdownBorder,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 8,
    zIndex: 100,
  },

  option: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: UI.dropdownBorder,
  },

  optionPressed: {
    backgroundColor: UI.optionHover,
  },

  optionText: {
    color: UI.dropdownText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },

  optionSub: {
    color: UI.dropdownSub,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});