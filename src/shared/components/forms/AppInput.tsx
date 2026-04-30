import React from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

type AppInputProps = TextInputProps & {
  icon?: string;
  rightElement?: React.ReactNode;
};

const C = {
  surfaceAlt: '#181c27',
  borderAlt: '#252938',
  text: '#f8fafc',
  textSub: '#8b92b0',
};

export default function AppInput({
  icon,
  rightElement,
  style,
  multiline,
  ...props
}: AppInputProps) {
  return (
    <View style={[styles.container, multiline && styles.containerMultiline]}>
      {icon && (
        <FeatherIcon
          name={icon}
          size={17}
          color={C.textSub}
          style={styles.icon}
        />
      )}

      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={C.textSub}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          style,
        ]}
      />

      {rightElement && (
        <View style={[styles.rightElement, multiline && styles.rightTop]}>
          {rightElement}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderAlt,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  containerMultiline: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingTop: 12,
  },

  icon: {
    marginRight: 10,
    marginTop: 2,
  },

  input: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 8,
  },

  rightElement: {
    marginLeft: 8,
  },

  rightTop: {
    marginTop: -4,
  },
});