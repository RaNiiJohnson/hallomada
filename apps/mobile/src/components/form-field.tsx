import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Labelled text input styled like the rest of the app. */
export function FormField({
  label,
  hint,
  error,
  multiline,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: error ? theme.destructive : focused ? theme.primary : theme.border,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <ThemedText type="small" style={{ color: theme.destructive }}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one + 2 },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  multiline: { minHeight: 140, paddingVertical: Spacing.three },
});
