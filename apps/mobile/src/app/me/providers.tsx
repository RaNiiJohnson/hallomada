import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { StatusBadge } from '@/components/owner-panel';
import { PaginatedList } from '@/components/paginated-list';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { providerCategoryLabels } from '@/lib/provider-labels';

const PAGE_SIZE = 20;

export default function MyProvidersScreen() {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(api.me.queries.getMyProviders, {}, { initialNumItems: PAGE_SIZE });

  return (
    <PaginatedList
      header={
        <View style={styles.header}>
          <ThemedText type="small" themeColor="textSecondary">
            Présentez votre activité (traiteur, photo, coiffure…) à la communauté malgache.
          </ThemedText>
          <Button label="Créer une page prestataire" icon="add" primary onPress={() => router.push('/providers/new')} />
        </View>
      }
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty={{
        icon: 'storefront-outline',
        title: 'Aucune page prestataire',
        description: 'Créez votre page pour apparaître dans l’annuaire des prestataires.',
      }}
      renderItem={(provider) => (
        <ListRow
          icon="storefront-outline"
          title={provider.name}
          subtitle={`${providerCategoryLabels[provider.category]} · ${provider.city}`}
          trailing={<StatusBadge status={provider.status} />}
          onPress={() => router.push({ pathname: '/providers/[slug]', params: { slug: provider.slug } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, marginBottom: Spacing.one },
});
