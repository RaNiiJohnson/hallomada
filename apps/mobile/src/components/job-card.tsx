import type { FunctionReturnType } from 'convex/server';
import { StyleSheet } from 'react-native';

import type { api } from '@convex/_generated/api';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';

type Job = FunctionReturnType<typeof api.jobs.queries.getJobs>['page'][number];

export function JobCard({ job }: { job: Job }) {
  const details = [job.city, job.contractType, job.workMode].filter(Boolean).join(' · ');

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{job.title}</ThemedText>
      {details ? (
        <ThemedText type="small" themeColor="textSecondary">
          {details}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
});
