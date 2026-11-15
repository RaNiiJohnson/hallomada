import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Badge } from './badge';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { providerCategoryLabels, providerStatusLabels } from '@/lib/provider-labels';

type Provider = FunctionReturnType<typeof api.providers.queries.listProviders>['page'][number];

/**
 * Same card as the web directory: a 16:9 cover, then the round logo next to
 * the name, the category chip, the city and the tagline. `compact` shrinks it
 * for the home carousel.
 */
export function ProviderCard({ provider, compact }: { provider: Provider; compact?: boolean }) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={provider.name}
      onPress={() => router.push({ pathname: '/providers/[slug]', params: { slug: provider.slug } })}
      style={({ pressed }) => [
        styles.card,
        compact && styles.fill,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.cover, { backgroundColor: theme.muted }]}>
        {provider.coverUrl ? (
          <Image source={provider.coverUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <Icon name="storefront-outline" size={40} themeColor="textSecondary" />
        )}
        {provider.status !== 'active' ? (
          <View style={styles.status}>
            <Badge label={providerStatusLabels[provider.status]} tone="secondary" />
          </View>
        ) : null}
      </View>
      <View style={[styles.body, compact && styles.compactBody]}>
        <ProviderAvatar name={provider.name} logoUrl={provider.logoUrl} size={compact ? 36 : 48} />
        <View style={styles.text}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {provider.name}
          </ThemedText>
          <View style={[styles.meta, compact && styles.compactMeta]}>
            <Badge label={providerCategoryLabels[provider.category]} tone="secondary" />
            <View style={styles.city}>
              <Icon name="location-outline" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {provider.city}
              </ThemedText>
            </View>
          </View>
          {provider.tagline ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={compact ? 1 : 2}>
              {provider.tagline}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Round logo, or the first letter in green on a soft green disc. */
export function ProviderAvatar({
  name,
  logoUrl,
  size = 48,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, backgroundColor: `${theme.primary}1A`, borderColor: theme.border },
      ]}>
      {logoUrl ? (
        <Image source={logoUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <ThemedText style={{ color: theme.primary, fontWeight: 600, fontSize: size * 0.36 }}>
          {(name.trim()[0] ?? '?').toUpperCase()}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  cover: { aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center' },
  status: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  body: { flexDirection: 'row', gap: Spacing.two + Spacing.one, padding: Spacing.three },
  // In the carousel every card fills the row height and keeps the same layout,
  // so a long category chip can't push the city to an extra line on one card only.
  fill: { flex: 1 },
  compactMeta: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  compactBody: { gap: Spacing.two, padding: Spacing.two + Spacing.one },
  text: { flex: 1, minWidth: 0, gap: Spacing.one },
  name: { fontWeight: 600 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  city: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avatar: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
