import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** "Filtres" pill that opens the extra filters, with the number of active ones. */
export function FilterToggle({ open, count, onPress }: { open: boolean; count: number; onPress: () => void }) {
  const theme = useTheme();
  const active = open || count > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={count ? `Filtres, ${count} actif(s)` : 'Filtres'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: theme.card,
          borderColor: active ? theme.text : theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <Icon name="options-outline" size={16} color={theme.text} />
      <ThemedText type="smallBold" style={{ color: theme.text }}>
        Filtres
      </ThemedText>
      {count ? (
        <View style={[styles.count, { backgroundColor: theme.primary }]}>
          <ThemedText style={[styles.countText, { color: theme.primaryForeground }]}>{count}</ThemedText>
        </View>
      ) : (
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textSecondary} />
      )}
    </Pressable>
  );
}

/** Card holding the extra filters, shown under the toggle. */
export function FilterPanel({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {children}
      {onReset ? (
        <Pressable accessibilityRole="button" onPress={onReset} hitSlop={6} style={styles.reset}>
          <Icon name="refresh" size={14} themeColor="text" />
          <ThemedText type="smallBold" themeColor="text">
            Réinitialiser les filtres
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
        {label.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  count: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText: { fontSize: 11, lineHeight: 13, fontWeight: 800 },
  panel: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  group: { gap: Spacing.two },
  label: { letterSpacing: 0.8 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-start' },
});
