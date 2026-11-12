import type { FunctionReturnType } from 'convex/server';
import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import type { api } from '@convex/_generated/api';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { contractLabel, locationLabel, salaryLabel } from '@/lib/job-labels';

type Job = FunctionReturnType<typeof api.jobs.queries.getJobs>['page'][number];

export function JobCard({ job }: { job: Job }) {
  const details = [job.company, locationLabel(job), contractLabel(job)].filter(Boolean).join(' · ');

  return (
    <Link href={{ pathname: '/jobs/[slug]', params: { slug: job.slug } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{job.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {details}
          </ThemedText>
          {job.salary !== undefined ? (
            <ThemedText type="small">{salaryLabel(job.salary, job.salaryPeriod)}</ThemedText>
          ) : null}
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  pressed: { opacity: 0.7 },
});
