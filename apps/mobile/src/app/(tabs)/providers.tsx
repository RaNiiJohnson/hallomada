import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ProviderCard } from '@/components/provider-card';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ProviderCategory, providerCategoryLabels } from '@/lib/provider-labels';
import { openWeb } from '@/lib/web';

const PAGE_SIZE = 12;

const categoryOptions: { value: ProviderCategory | undefined; label: string }[] = [
  { value: undefined, label: 'Toutes' },
  ...(Object.entries(providerCategoryLabels) as [ProviderCategory, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

export default function ProvidersScreen() {
  const theme = useTheme();
  const [category, setCategory] = useState<ProviderCategory>();
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce typing so each keystroke does not start a new query.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const { results, status, loadMore } = usePaginatedQuery(
    api.providers.queries.listProviders,
    { ...(category ? { category } : {}), ...(searchTerm ? { searchTerm } : {}) },
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={results}
          keyExtractor={(provider) => provider._id}
          renderItem={({ item }) => <ProviderCard provider={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title">Prestataires</ThemedText>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Rechercher un prestataire, un service, une ville…"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="search"
                style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              />
              <Segmented options={categoryOptions} value={category} onChange={setCategory} />
            </View>
          }
          ListEmptyComponent={
            status === 'LoadingFirstPage' ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              <View style={styles.empty}>
                <ThemedText type="smallBold">Aucun prestataire pour l&apos;instant</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Vous proposez un service ? Créez votre page, c&apos;est gratuit.
                </ThemedText>
                <Button label="Créer ma page prestataire" onPress={() => openWeb('/providers/new')} />
              </View>
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
  search: { minHeight: 44, borderRadius: Spacing.three, paddingHorizontal: Spacing.three, fontSize: 16 },
  loader: { marginVertical: Spacing.four },
  empty: { gap: Spacing.two },
});
