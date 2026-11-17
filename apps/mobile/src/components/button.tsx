import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'outline' | 'ghost' | 'destructive';

export function Button({
  label,
  onPress,
  loading,
  disabled,
  primary,
  variant,
  icon,
  size = 'md',
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Shorthand for variant="primary". */
  primary?: boolean;
  variant?: ButtonVariant;
  icon?: IconName;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const kind: ButtonVariant = variant ?? (primary ? 'primary' : 'secondary');
  const palette = {
    primary: { background: theme.primary, color: theme.primaryForeground, border: theme.primary },
    brand: { background: theme.brand, color: theme.brandForeground, border: theme.brand },
    secondary: { background: theme.muted, color: theme.text, border: theme.muted },
    outline: { background: theme.card, color: theme.text, border: theme.border },
    ghost: { background: 'transparent', color: theme.text, border: 'transparent' },
    destructive: { background: theme.destructiveSoft, color: theme.destructive, border: theme.destructiveSoft },
  }[kind];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.small,
        (kind === 'primary' || kind === 'brand') && styles.pill,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: inactive ? 0.5 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.color} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={palette.color} /> : null}
          <ThemedText type="smallBold" style={{ color: palette.color }} numberOfLines={1}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/** Round icon-only button, e.g. in headers. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = 'default',
  size = 40,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'primary' | 'plain';
  size?: number;
}) {
  const theme = useTheme();
  const background =
    tone === 'primary' ? theme.primary : tone === 'plain' ? 'transparent' : theme.card;
  const color = tone === 'primary' ? theme.primaryForeground : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          backgroundColor: background,
          borderColor: tone === 'default' ? theme.border : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Icon name={icon} size={size * 0.5} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  pill: { borderRadius: Radius.full, paddingHorizontal: Spacing.four },
  small: { minHeight: 36, paddingHorizontal: Spacing.two + Spacing.one },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
