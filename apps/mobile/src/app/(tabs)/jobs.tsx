import { api } from '@convex/_generated/api';
import type { JobType, WorkMode } from '@hallomada/shared/job-offer-options';
import { jobTypeValues, selectableContractTypes, workModeValues } from '@hallomada/shared/job-offer-options';
import { useConvexAuth, usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { JobCard } from '@/components/job-card';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { FilterGroup, FilterPanel, FilterToggle } from '@/components/filters';
import { Chip, Segmented } from '@/components/segmented';
import { TabList } from '@/components/tab-list';
import { Spacing } from '@/constants/theme';
import { useDebounced } from '@/hooks/use-debounced';
import { jobTypeLabel, workModeLabel } from '@/lib/job-labels';

const PAGE_SIZE = 20;

const typeOptions: { value: JobType | undefined; label: string }[] = [
  { value: undefined, label: 'Tous' },
  ...jobTypeValues.map((value) => ({ value, label: jobTypeLabel(value) })),
];
const modeOptions: { value: WorkMode | undefined; label: string }[] = [
  { value: undefined, label: 'Tous lieux' },
  ...workModeValues.map((value) => ({ value, label: workModeLabel(value) })),
];
type Contract = (typeof selectableContractTypes)[number];
const contractOptions: { value: Contract | undefined; label: string }[] = [
  { value: undefined, label: 'Tous contrats' },
  ...selectableContractTypes.map((value) => ({ value, label: value })),
];

export default function JobsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [input, setInput] = useState('');
  const [type, setType] = useState<JobType>();
  const [workMode, setWorkMode] = useState<WorkMode>();
  const [contractType, setContractType] = useState<Contract>();
  const [favorites, setFavorites] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchTerm = useDebounced(input.trim());
  const bookmarkedOnly = favorites && isAuthenticated;
  const extraCount = (workMode ? 1 : 0) + (contractType ? 1 : 0);
  const filtered = Boolean(searchTerm || type || extraCount || bookmarkedOnly);
  const resetExtra = () => {
    setWorkMode(undefined);
    setContractType(undefined);
  };
  const publish = () => router.push(isAuthenticated ? '/jobs/new' : '/account');

  const { results, status, loadMore } = usePaginatedQuery(
    api.jobs.queries.getJobs,
    {
      ...(searchTerm ? { searchTerm } : {}),
      ...(type ? { type } : {}),
      ...(workMode ? { workMode } : {}),
      ...(contractType ? { contractType } : {}),
      ...(bookmarkedOnly ? { bookmarkedOnly } : {}),
    },
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <TabList
      data={results}
      renderItem={(job) => <JobCard job={job} />}
      loading={status === 'LoadingFirstPage'}
      loadingMore={status === 'LoadingMore'}
      onEndReached={() => status === 'CanLoadMore' && loadMore(PAGE_SIZE)}
      header={
        <ScreenHeader
          title="Emplois"
          subtitle="Jobs, stages, au pair et formations en Allemagne">
          <View style={styles.filters}>
            <View style={styles.searchRow}>
              <View style={styles.flex}>
                <SearchBar value={input} onChangeText={setInput} placeholder="Poste, entreprise, ville…" />
              </View>
              <Button label="Publier" icon="add" primary onPress={publish} />
            </View>
            <Segmented scroll options={typeOptions} value={type} onChange={setType} />
            <View style={styles.toolbar}>
              <FilterToggle open={showFilters} count={extraCount} onPress={() => setShowFilters((v) => !v)} />
              {isAuthenticated ? (
                <Chip label="Mes favoris" check selected={favorites} onPress={() => setFavorites((v) => !v)} />
              ) : null}
            </View>
            {showFilters ? (
              <FilterPanel onReset={extraCount ? resetExtra : undefined}>
                <FilterGroup label="Contrat">
                  <Segmented options={contractOptions} value={contractType} onChange={setContractType} />
                </FilterGroup>
                <FilterGroup label="Lieu de travail">
                  <Segmented options={modeOptions} value={workMode} onChange={setWorkMode} />
                </FilterGroup>
              </FilterPanel>
            ) : null}
          </View>
        </ScreenHeader>
      }
      empty={
        bookmarkedOnly && !searchTerm && !type && !extraCount
          ? { icon: 'bookmark-outline', title: 'Aucun favori', description: 'Touchez le signet d’une offre pour la retrouver ici.' }
          : filtered
          ? { icon: 'search-outline', title: 'Aucun résultat', description: 'Essayez d’autres mots-clés ou filtres.' }
          : {
              icon: 'briefcase-outline',
              title: 'Aucune offre pour le moment',
              description: 'Publiez la première offre pour la communauté.',
              actionLabel: 'Publier une offre',
              onAction: publish,
            }
      }
    />
  );
}

const styles = StyleSheet.create({
  filters: { gap: Spacing.two },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
});
