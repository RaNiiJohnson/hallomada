import { api } from '@convex/_generated/api';
import type { JobType, WorkMode } from '@hallomada/shared/job-offer-options';
import { jobTypeValues, workModeValues } from '@hallomada/shared/job-offer-options';
import { useConvexAuth, usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/button';
import { JobCard } from '@/components/job-card';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { Segmented } from '@/components/segmented';
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

export default function JobsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [input, setInput] = useState('');
  const [type, setType] = useState<JobType>();
  const [workMode, setWorkMode] = useState<WorkMode>();
  const searchTerm = useDebounced(input.trim());
  const filtered = Boolean(searchTerm || type || workMode);

  const { results, status, loadMore } = usePaginatedQuery(
    api.jobs.queries.getJobs,
    {
      ...(searchTerm ? { searchTerm } : {}),
      ...(type ? { type } : {}),
      ...(workMode ? { workMode } : {}),
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
          title="Jobs"
          subtitle="Emplois, stages, au pair et formations en Allemagne"
          actions={
            <IconButton
              icon="add"
              tone="primary"
              label="Publier une offre"
              onPress={() => router.push(isAuthenticated ? '/jobs/new' : '/account')}
            />
          }>
          <View style={styles.filters}>
            <SearchBar value={input} onChangeText={setInput} placeholder="Poste, entreprise, ville…" />
            <Segmented scroll options={typeOptions} value={type} onChange={setType} />
            <Segmented scroll options={modeOptions} value={workMode} onChange={setWorkMode} />
          </View>
        </ScreenHeader>
      }
      empty={
        filtered
          ? { icon: 'search-outline', title: 'Aucun résultat', description: 'Essayez d’autres mots-clés ou filtres.' }
          : {
              icon: 'briefcase-outline',
              title: 'Aucune offre pour le moment',
              description: 'Publiez la première offre pour la communauté.',
              actionLabel: 'Publier une offre',
              onAction: () => router.push(isAuthenticated ? '/jobs/new' : '/account'),
            }
      }
    />
  );
}

const styles = StyleSheet.create({
  filters: { gap: Spacing.two },
});
