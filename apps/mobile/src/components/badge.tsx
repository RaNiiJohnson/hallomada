import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'primary' | 'solid' | 'secondary' | 'info' | 'warning' | 'danger';

/** Small pill label. */
export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
  const theme = useTheme();
  const { background, color } = {
    neutral: { background: theme.muted, color: theme.text },
    primary: { background: theme.primarySoft, color: theme.primaryText },
    // Same as the web default badge: green fill.
    solid: { background: theme.primary, color: theme.primaryForeground },
    secondary: { background: theme.secondary, color: theme.text },
    info: { background: theme.infoSoft, color: theme.info },
    warning: { background: theme.warningSoft, color: theme.warning },
    danger: { background: theme.destructiveSoft, color: theme.destructive },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <ThemedText type="caption" style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  label: { fontWeight: 600 },
});
