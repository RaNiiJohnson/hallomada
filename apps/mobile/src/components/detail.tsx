import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from './card';
import { EmptyState } from './empty-state';
import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Card of label/value rows; rows without a value are skipped. */
export function FactList({ facts }: { facts: [string, string | null | undefined][] }) {
  const theme = useTheme();
  const rows = facts.filter((fact): fact is [string, string] => Boolean(fact[1]));
  if (rows.length === 0) return null;
  return (
    <Card padded={false}>
      {rows.map(([label, value], index) => (
        <View
          key={label}
          style={[
            styles.fact,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.factValue}>
            {value}
          </ThemedText>
        </View>
      ))}
    </Card>
  );
}

export function Section({ title, body, icon }: { title: string; body: string; icon?: IconName }) {
  return (
    <View style={styles.section}>
      <SectionTitle title={title} icon={icon} />
      <ThemedText style={styles.body}>{body}</ThemedText>
    </View>
  );
}

export function SectionTitle({ title, icon }: { title: string; icon?: IconName }) {
  return (
    <View style={styles.sectionTitle}>
      {icon ? <Icon name={icon} size={18} themeColor="primaryText" /> : null}
      <ThemedText type="heading">{title}</ThemedText>
    </View>
  );
}

/** Amber banner for content waiting for moderation. */
export function PendingBanner({ title, description }: { title: string; description: string }) {
  return <Banner tone="warning" icon="time-outline" title={title} description={description} />;
}

export function Banner({
  title,
  description,
  icon,
  tone = 'info',
}: {
  title: string;
  description?: string;
  icon?: IconName;
  tone?: 'info' | 'warning' | 'primary' | 'danger';
}) {
  const theme = useTheme();
  const { background, color } = {
    info: { background: theme.infoSoft, color: theme.info },
    warning: { background: theme.warningSoft, color: theme.warning },
    primary: { background: theme.primarySoft, color: theme.primaryText },
    danger: { background: theme.destructiveSoft, color: theme.destructive },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: background }]}>
      {icon ? <Icon name={icon} size={20} color={color} /> : null}
      <View style={styles.bannerText}>
        <ThemedText type="smallBold" style={{ color }}>
          {title}
        </ThemedText>
        {description ? <ThemedText type="small">{description}</ThemedText> : null}
      </View>
    </View>
  );
}

export function CenteredMessage({
  title,
  description,
  icon = 'search-outline',
}: {
  title: string;
  description?: string;
  icon?: IconName;
}) {
  return (
    <ThemedView style={styles.centered}>
      <EmptyState icon={icon} title={title} description={description} />
    </ThemedView>
  );
}

/** Wrapping row of secondary actions (save, share, report…). */
export function ActionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.actionRow}>{children}</View>;
}

export function LoadingScreen() {
  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator size="large" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
  },
  factValue: { flexShrink: 1, textAlign: 'right' },
  section: { gap: Spacing.two },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  body: { lineHeight: 24 },
  banner: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.two + Spacing.one,
  },
  bannerText: { flex: 1, gap: Spacing.half },
  centered: { flex: 1, justifyContent: 'center' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
