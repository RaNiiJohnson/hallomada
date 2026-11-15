import type { FunctionReturnType } from 'convex/server';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Badge } from './badge';
import { BookmarkIcon } from './bookmark-button';
import { Card } from './card';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { contractLabel, jobTypeLabel, locationLabel, salaryLabel } from '@/lib/job-labels';

type Job = FunctionReturnType<typeof api.jobs.queries.getJobs>['page'][number];

/** Compact job offer: title, who and where, then what kind and how much. */
export function JobCard({ job }: { job: Job }) {
  const router = useRouter();
  const contract = contractLabel(job);
  const kind = [jobTypeLabel(job.type), contract].filter(Boolean).join(' · ');

  return (
    <Card
      accessibilityLabel={job.title}
      overlay={<BookmarkIcon resourceType="job" resourceId={job._id} isBookmarked={job.isBookmarked} />}
      onPress={() => router.push({ pathname: '/jobs/[slug]', params: { slug: job.slug } })}>
      {job.status === 'pending' ? <Badge label="En attente de validation" tone="warning" icon="time-outline" /> : null}
      <View style={styles.head}>
        <ThemedText type="heading" numberOfLines={2}>
          {job.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {job.company} · {locationLabel(job)}
        </ThemedText>
      </View>
      <View style={styles.bottom}>
        <ThemedText type="small" numberOfLines={1} style={styles.kind}>
          {kind}
        </ThemedText>
        {job.salary !== undefined ? (
          <ThemedText type="smallBold" numberOfLines={1}>
            {salaryLabel(job.salary, job.salaryPeriod)}
          </ThemedText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Leaves room for the bookmark toggle in the corner.
  head: { gap: Spacing.half, paddingRight: Spacing.five + Spacing.one },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  kind: { flexShrink: 1 },
});
