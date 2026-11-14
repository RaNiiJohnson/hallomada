import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Avatar } from './avatar';
import { Badge } from './badge';
import { Card } from './card';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { providerCategoryLabels, providerStatusLabels } from '@/lib/provider-labels';

type Provider = FunctionReturnType<typeof api.providers.queries.listProviders>['page'][number];

export function ProviderCard({ provider }: { provider: Provider }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Card
      padded={false}
      accessibilityLabel={provider.name}
      onPress={() => router.push({ pathname: '/providers/[slug]', params: { slug: provider.slug } })}>
      <View style={[styles.cover, { backgroundColor: theme.primarySoft }]}>
        {provider.coverUrl ? (
          <Image source={provider.coverUrl} style={styles.flex} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.placeholder, styles.faded]}>
            <Icon name="storefront-outline" size={32} color={theme.primary} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={[styles.logo, { borderColor: theme.card }]}>
          <Avatar uri={provider.logoUrl} name={provider.name} size={56} />
        </View>
        <View style={styles.text}>
          <ThemedText type="heading" numberOfLines={1}>
            {provider.name}
          </ThemedText>
          {provider.tagline ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {provider.tagline}
            </ThemedText>
          ) : null}
          <View style={styles.row}>
            <Badge label={providerCategoryLabels[provider.category]} tone="primary" />
            {provider.status !== 'active' ? (
              <Badge label={providerStatusLabels[provider.status]} tone="warning" />
            ) : null}
            <View style={styles.city}>
              <Icon name="location-outline" size={14} themeColor="textSecondary" />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {provider.city}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cover: { height: 96 },
  placeholder: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingRight: Spacing.four },
  faded: { opacity: 0.5 },
  body: { padding: Spacing.three, paddingTop: 0, gap: Spacing.two },
  logo: { marginTop: -28, borderWidth: 3, borderRadius: 31, alignSelf: 'flex-start' },
  text: { gap: Spacing.one },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  city: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
