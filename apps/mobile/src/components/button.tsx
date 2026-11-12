import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Button({
  label,
  onPress,
  loading,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  const theme = useTheme();
  const background = primary ? theme.text : theme.backgroundElement;
  const color = primary ? theme.background : theme.text;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <ThemedText type="smallBold" style={{ color }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
});
