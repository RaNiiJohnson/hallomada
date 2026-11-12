import type { FunctionReturnType } from 'convex/server';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Badge } from './badge';
import { Card } from './card';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { contractLabel, jobTypeLabel, locationLabel, salaryLabel } from '@/lib/job-labels';
import { timeAgo } from '@/lib/time';

type Job = FunctionReturnType<typeof api.jobs.queries.getJobs>['page'][number];

export function JobCard({ job }: { job: Job }) {
  const router = useRouter();
  const contract = contractLabel(job);

  return (
    <Card
      accessibilityLabel={job.title}
      onPress={() => router.push({ pathname: '/jobs/[slug]', params: { slug: job.slug } })}>
      <View style={styles.top}>
        <Badge label={jobTypeLabel(job.type)} tone="primary" />
        <ThemedText type="caption" themeColor="textSecondary">
          {timeAgo(job.listedAt ?? job._creationTime)}
        </ThemedText>
      </View>
      <ThemedText type="heading" numberOfLines={2}>
        {job.title}
      </ThemedText>
      <View style={styles.meta}>
        <Meta icon="business-outline" text={job.company} />
        <Meta icon="location-outline" text={locationLabel(job)} />
        {contract ? <Meta icon="document-text-outline" text={contract} /> : null}
      </View>
      {job.salary !== undefined ? (
        <ThemedText type="smallBold" themeColor="primaryText">
          {salaryLabel(job.salary, job.salaryPeriod)}
        </ThemedText>
      ) : null}
    </Card>
  );
}

function Meta({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={14} themeColor="textSecondary" />
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.metaText}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.one },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, maxWidth: '100%' },
  metaText: { flexShrink: 1 },
});
