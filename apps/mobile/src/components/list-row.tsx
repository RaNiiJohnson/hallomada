import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tappable card row used by the personal-space lists and settings. */
export function ListRow({
  title,
  subtitle,
  meta,
  highlighted,
  icon,
  trailing,
  destructive,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  highlighted?: boolean;
  icon?: IconName;
  trailing?: React.ReactNode;
  destructive?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: highlighted ? theme.muted : theme.card,
          borderColor: theme.border,
        },
        pressed && styles.pressed,
      ]}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: destructive ? theme.destructiveSoft : theme.muted }]}>
          <Icon name={icon} size={18} color={destructive ? theme.destructive : theme.text} />
        </View>
      ) : null}
      <View style={styles.text}>
        <ThemedText
          type="smallBold"
          style={destructive ? { color: theme.destructive } : undefined}
          numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
        {meta ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {meta}
          </ThemedText>
        ) : null}
      </View>
      {highlighted ? <View style={[styles.dot, { backgroundColor: theme.brand }]} /> : null}
      {trailing}
      {onPress && !trailing ? <Icon name="chevron-forward" size={18} themeColor="textSecondary" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.three,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: Spacing.half },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pressed: { opacity: 0.7 },
});
