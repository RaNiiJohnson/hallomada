import { api } from '@convex/_generated/api';
import { useConvexAuth, usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/button';
import { ProviderCard } from '@/components/provider-card';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { Segmented } from '@/components/segmented';
import { TabList } from '@/components/tab-list';
import { Spacing } from '@/constants/theme';
import { useDebounced } from '@/hooks/use-debounced';
import { type ProviderCategory, providerCategoryLabels } from '@/lib/provider-labels';

const PAGE_SIZE = 12;

const categoryOptions: { value: ProviderCategory | undefined; label: string }[] = [
  { value: undefined, label: 'Toutes' },
  ...(Object.entries(providerCategoryLabels) as [ProviderCategory, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

export default function ProvidersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [category, setCategory] = useState<ProviderCategory>();
  const [input, setInput] = useState('');
  const searchTerm = useDebounced(input.trim());
  const create = () => router.push(isAuthenticated ? '/providers/new' : '/account');

  const { results, status, loadMore } = usePaginatedQuery(
    api.providers.queries.listProviders,
    { ...(category ? { category } : {}), ...(searchTerm ? { searchTerm } : {}) },
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <TabList
      data={results}
      renderItem={(provider) => <ProviderCard provider={provider} />}
      loading={status === 'LoadingFirstPage'}
      loadingMore={status === 'LoadingMore'}
      onEndReached={() => status === 'CanLoadMore' && loadMore(PAGE_SIZE)}
      header={
        <ScreenHeader
          title="Prestataires"
          subtitle="Les talents de la communauté près de chez vous"
          actions={<IconButton icon="add" tone="primary" label="Créer ma page" onPress={create} />}>
          <View style={styles.filters}>
            <SearchBar value={input} onChangeText={setInput} placeholder="Service, nom, ville…" />
            <Segmented scroll options={categoryOptions} value={category} onChange={setCategory} />
          </View>
        </ScreenHeader>
      }
      empty={
        searchTerm || category
          ? { icon: 'search-outline', title: 'Aucun résultat', description: 'Essayez d’autres mots-clés ou une autre catégorie.' }
          : {
              icon: 'construct-outline',
              title: 'Aucun prestataire pour l’instant',
              description: 'Vous proposez un service ? Créez votre page, c’est gratuit.',
              actionLabel: 'Créer ma page prestataire',
              onAction: create,
            }
      }
    />
  );
}

const styles = StyleSheet.create({
  filters: { gap: Spacing.two },
});
