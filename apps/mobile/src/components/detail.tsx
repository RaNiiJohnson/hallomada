import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';

/** Card of label/value rows; rows without a value are skipped. */
export function FactList({ facts }: { facts: [string, string | null | undefined][] }) {
  const rows = facts.filter((fact): fact is [string, string] => Boolean(fact[1]));
  if (rows.length === 0) return null;
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.fact}>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.factValue}>
            {value}
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

export function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText>{body}</ThemedText>
    </View>
  );
}

/** Amber banner for content waiting for moderation. */
export function PendingBanner({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.pending}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
    </View>
  );
}

export function CenteredMessage({ title, description }: { title: string; description?: string }) {
  return (
    <ThemedView style={styles.centered}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {description ? <ThemedText themeColor="textSecondary">{description}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  factValue: { flexShrink: 1, textAlign: 'right' },
  section: { gap: Spacing.two },
  pending: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#F5A524',
    gap: Spacing.one,
  },
  centered: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
});
