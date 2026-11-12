import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/listing-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { ListingMode } from '@/lib/listing-labels';

const PAGE_SIZE = 12;

const modeFilters: { value: ListingMode | undefined; label: string }[] = [
  { value: undefined, label: 'Tout' },
  { value: 'rent', label: 'À louer' },
  { value: 'sale', label: 'À vendre' },
];

export default function ListingsScreen() {
  const [listingMode, setListingMode] = useState<ListingMode>();
  const { results, status, loadMore } = usePaginatedQuery(
    api.listings.queries.getListing,
    listingMode ? { listingMode } : {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={results}
          keyExtractor={(listing) => listing._id}
          renderItem={({ item }) => <ListingCard listing={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title">Annonces</ThemedText>
              <View style={styles.filters}>
                {modeFilters.map((filter) => {
                  const selected = filter.value === listingMode;
                  return (
                    <Pressable
                      key={filter.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setListingMode(filter.value)}>
                      <ThemedView
                        type={selected ? 'backgroundSelected' : 'backgroundElement'}
                        style={styles.chip}>
                        <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                          {filter.label}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          }
          ListEmptyComponent={
            status === 'LoadingFirstPage' ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              <ThemedText themeColor="textSecondary">Aucune annonce pour le moment.</ThemedText>
            )
          }
          ListFooterComponent={
            status === 'LoadingMore' ? <ActivityIndicator style={styles.loader} /> : undefined
          }
          onEndReached={() => {
            if (status === 'CanLoadMore') loadMore(PAGE_SIZE);
          }}
          onEndReachedThreshold={0.5}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  header: { marginTop: Spacing.three, gap: Spacing.three },
  filters: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  loader: { marginVertical: Spacing.four },
});
