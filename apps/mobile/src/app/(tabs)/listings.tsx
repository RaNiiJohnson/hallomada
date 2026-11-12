import { api } from '@convex/_generated/api';
import { useConvexAuth, usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/button';
import { ListingCard } from '@/components/listing-card';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { Segmented } from '@/components/segmented';
import { TabList } from '@/components/tab-list';
import { Spacing } from '@/constants/theme';
import { useDebounced } from '@/hooks/use-debounced';
import { type ListingMode, type PropertyType, propertyTypes } from '@/lib/listing-labels';

const PAGE_SIZE = 12;

const modeOptions: { value: ListingMode | undefined; label: string }[] = [
  { value: undefined, label: 'Tout' },
  { value: 'rent', label: 'À louer' },
  { value: 'sale', label: 'À vendre' },
];
const typeOptions: { value: PropertyType | undefined; label: string }[] = [
  { value: undefined, label: 'Tous types' },
  ...(Object.entries(propertyTypes) as [PropertyType, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

export default function ListingsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [input, setInput] = useState('');
  const [listingMode, setListingMode] = useState<ListingMode>();
  const [propertyType, setPropertyType] = useState<PropertyType>();
  const searchTerm = useDebounced(input.trim());
  const filtered = Boolean(searchTerm || listingMode || propertyType);
  const publish = () => router.push(isAuthenticated ? '/listings/new' : '/account');

  const { results, status, loadMore } = usePaginatedQuery(
    api.listings.queries.getListing,
    {
      ...(searchTerm ? { searchTerm } : {}),
      ...(listingMode ? { listingMode } : {}),
      ...(propertyType ? { propertyType } : {}),
    },
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <TabList
      data={results}
      renderItem={(listing) => <ListingCard listing={listing} />}
      loading={status === 'LoadingFirstPage'}
      loadingMore={status === 'LoadingMore'}
      onEndReached={() => status === 'CanLoadMore' && loadMore(PAGE_SIZE)}
      header={
        <ScreenHeader
          title="Annonces"
          subtitle="Logements à louer et à vendre"
          actions={<IconButton icon="add" tone="primary" label="Publier une annonce" onPress={publish} />}>
          <View style={styles.filters}>
            <SearchBar value={input} onChangeText={setInput} placeholder="Ville, quartier, titre…" />
            <Segmented options={modeOptions} value={listingMode} onChange={setListingMode} />
            <Segmented scroll options={typeOptions} value={propertyType} onChange={setPropertyType} />
          </View>
        </ScreenHeader>
      }
      empty={
        filtered
          ? { icon: 'search-outline', title: 'Aucun résultat', description: 'Essayez d’autres mots-clés ou filtres.' }
          : {
              icon: 'home-outline',
              title: 'Aucune annonce pour le moment',
              description: 'Vous cherchez un colocataire ou louez un logement ?',
              actionLabel: 'Publier une annonce',
              onAction: publish,
            }
      }
    />
  );
}

const styles = StyleSheet.create({
  filters: { gap: Spacing.two },
});
