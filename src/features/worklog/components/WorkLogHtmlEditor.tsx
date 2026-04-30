import React from 'react';
import { View, StyleSheet } from 'react-native';
import SectionLabel from '../../../shared/components/forms/SectionLabel';
import RichHtmlEditor from '../../../shared/components/forms/RichHtmlEditor';

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export default function WorkLogHtmlEditor({ value, onChange }: Props) {
  return (
    <View style={styles.card}>
      <SectionLabel icon="align-left" title="Détails" />

      <View style={styles.editor}>
        <RichHtmlEditor
          value={value}
          onChange={onChange}
          height={300}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#111520',
  },
  editor: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
});