import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Badge } from './badge';
import { Card } from './card';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { providerCategoryLabels, providerStatusLabels } from '@/lib/provider-labels';

type Provider = FunctionReturnType<typeof api.providers.queries.listProviders>['page'][number];

const THUMB = 72;

/** One row per provider: a square photo, the name, what they do and where. */
export function ProviderCard({ provider }: { provider: Provider }) {
  const router = useRouter();
  const theme = useTheme();
  const photo = provider.logoUrl ?? provider.coverUrl;

  return (
    <Card
      accessibilityLabel={provider.name}
      onPress={() => router.push({ pathname: '/providers/[slug]', params: { slug: provider.slug } })}
      style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: theme.muted }]}>
          {photo ? (
            <Image source={photo} style={styles.fill} contentFit="cover" transition={150} />
          ) : (
            <ThemedText style={styles.initial}>{(provider.name.trim()[0] ?? '?').toUpperCase()}</ThemedText>
          )}
        </View>
        <View style={styles.text}>
          {provider.status !== 'active' ? (
            <Badge label={providerStatusLabels[provider.status]} tone="warning" />
          ) : null}
          <ThemedText type="heading" numberOfLines={1}>
            {provider.name}
          </ThemedText>
          {provider.tagline ? (
            <ThemedText type="small" numberOfLines={1}>
              {provider.tagline}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {providerCategoryLabels[provider.category]} · {provider.city}
          </ThemedText>
        </View>
        <Icon name="chevron-forward" size={18} themeColor="textSecondary" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { width: '100%', height: '100%' },
  initial: { fontSize: 24, lineHeight: 28, fontWeight: 600 },
  text: { flex: 1, gap: Spacing.half },
});
