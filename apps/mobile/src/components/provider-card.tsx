import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { providerCategoryLabels, providerStatusLabels } from '@/lib/provider-labels';

type Provider = FunctionReturnType<typeof api.providers.queries.listProviders>['page'][number];

export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <Link href={{ pathname: '/providers/[slug]', params: { slug: provider.slug } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          {provider.coverUrl ? (
            <Image source={provider.coverUrl} style={styles.cover} contentFit="cover" transition={150} />
          ) : null}
          <View style={styles.body}>
            {provider.logoUrl ? (
              <Image source={provider.logoUrl} style={styles.logo} contentFit="cover" />
            ) : null}
            <View style={styles.text}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {provider.name}
              </ThemedText>
              {provider.tagline ? (
                <ThemedText type="small" numberOfLines={2}>
                  {provider.tagline}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {providerCategoryLabels[provider.category]} · {provider.city}
                {provider.status !== 'active' ? ` · ${providerStatusLabels[provider.status]}` : ''}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, overflow: 'hidden' },
  cover: { aspectRatio: 16 / 9, backgroundColor: '#8884' },
  body: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, alignItems: 'center' },
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8884' },
  text: { flex: 1, gap: Spacing.half },
  pressed: { opacity: 0.7 },
});
