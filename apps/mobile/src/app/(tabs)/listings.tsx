import { api } from '@convex/_generated/api';
import { useConvexAuth, usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ListingCard } from '@/components/listing-card';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { FilterGroup, FilterPanel, FilterToggle } from '@/components/filters';
import { FormField } from '@/components/form-field';
import { Chip, Segmented } from '@/components/segmented';
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

const bedroomOptions: { value: string | undefined; label: string }[] = [
  { value: undefined, label: 'Toutes' },
  { value: '1', label: '1 chambre' },
  { value: '2', label: '2 chambres' },
  { value: '3', label: '3 chambres' },
  { value: '4', label: '4+ chambres' },
];

/** Positive whole number typed in a price field, or undefined. */
function parsePrice(text: string) {
  const value = Number.parseInt(text.replace(/\D/g, ''), 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export default function ListingsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [input, setInput] = useState('');
  const [listingMode, setListingMode] = useState<ListingMode>();
  const [propertyType, setPropertyType] = useState<PropertyType>();
  const [bedrooms, setBedrooms] = useState<string>();
  const [minInput, setMinInput] = useState('');
  const [maxInput, setMaxInput] = useState('');
  const [favorites, setFavorites] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchTerm = useDebounced(input.trim());
  const minPrice = parsePrice(useDebounced(minInput));
  const maxPrice = parsePrice(useDebounced(maxInput));
  const bookmarkedOnly = favorites && isAuthenticated;
  const extraCount = (bedrooms ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);
  const filtered = Boolean(searchTerm || listingMode || propertyType || extraCount || bookmarkedOnly);
  const resetExtra = () => {
    setBedrooms(undefined);
    setMinInput('');
    setMaxInput('');
  };
  const publish = () => router.push(isAuthenticated ? '/listings/new' : '/account');

  const { results, status, loadMore } = usePaginatedQuery(
    api.listings.queries.getListing,
    {
      ...(searchTerm ? { searchTerm } : {}),
      ...(listingMode ? { listingMode } : {}),
      ...(propertyType ? { propertyType } : {}),
      ...(bedrooms ? { bedrooms: Number(bedrooms) } : {}),
      ...(minPrice ? { minPrice } : {}),
      ...(maxPrice ? { maxPrice } : {}),
      ...(bookmarkedOnly ? { bookmarkedOnly } : {}),
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
          title="Immobilier"
          subtitle="Logements et colocations à louer ou à vendre">
          <View style={styles.filters}>
            <View style={styles.searchRow}>
              <View style={styles.flex}>
                <SearchBar value={input} onChangeText={setInput} placeholder="Ville, quartier, titre…" />
              </View>
              <Button label="Publier" icon="add" primary onPress={publish} />
            </View>
            <Segmented options={modeOptions} value={listingMode} onChange={setListingMode} />
            <Segmented scroll options={typeOptions} value={propertyType} onChange={setPropertyType} />
            <View style={styles.toolbar}>
              <FilterToggle open={showFilters} count={extraCount} onPress={() => setShowFilters((v) => !v)} />
              {isAuthenticated ? (
                <Chip label="Mes favoris" check selected={favorites} onPress={() => setFavorites((v) => !v)} />
              ) : null}
            </View>
            {showFilters ? (
              <FilterPanel onReset={extraCount ? resetExtra : undefined}>
                <FilterGroup label="Chambres">
                  <Segmented scroll options={bedroomOptions} value={bedrooms} onChange={setBedrooms} />
                </FilterGroup>
                <FilterGroup label="Prix (€)">
                  <View style={styles.searchRow}>
                    <View style={styles.flex}>
                      <FormField
                        label="Minimum"
                        value={minInput}
                        onChangeText={setMinInput}
                        keyboardType="number-pad"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.flex}>
                      <FormField
                        label="Maximum"
                        value={maxInput}
                        onChangeText={setMaxInput}
                        keyboardType="number-pad"
                        placeholder="Sans limite"
                      />
                    </View>
                  </View>
                </FilterGroup>
              </FilterPanel>
            ) : null}
          </View>
        </ScreenHeader>
      }
      empty={
        bookmarkedOnly && !searchTerm && !listingMode && !propertyType && !extraCount
          ? { icon: 'bookmark-outline', title: 'Aucun favori', description: 'Touchez le signet d’une annonce pour la retrouver ici.' }
          : filtered
          ? { icon: 'search-outline', title: 'Aucun résultat', description: 'Essayez d’autres mots-clés ou filtres.' }
          : {
              icon: 'business-outline',
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
});
