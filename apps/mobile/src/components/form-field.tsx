import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Labelled text input styled like the rest of the app. */
export function FormField({
  label,
  hint,
  multiline,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: theme.backgroundElement, color: theme.text },
          style,
        ]}
        {...props}
      />
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  input: { minHeight: 48, borderRadius: Spacing.three, paddingHorizontal: Spacing.three, fontSize: 16 },
  multiline: { minHeight: 160, paddingVertical: Spacing.three },
});
