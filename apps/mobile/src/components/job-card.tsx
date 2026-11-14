import type { FunctionReturnType } from 'convex/server';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Badge } from './badge';
import { BookmarkIcon } from './bookmark-button';
import { Card } from './card';
import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { contractLabel, jobTypeLabel, locationLabel, salaryLabel, workModeLabel } from '@/lib/job-labels';
import { timeAgo } from '@/lib/time';

type Job = FunctionReturnType<typeof api.jobs.queries.getJobs>['page'][number];

export function JobCard({ job }: { job: Job }) {
  const router = useRouter();
  const theme = useTheme();
  const contract = contractLabel(job);
  const pending = job.status === 'pending';

  return (
    <Card
      accessibilityLabel={job.title}
      style={pending && { borderColor: theme.warning, backgroundColor: theme.warningSoft }}
      onPress={() => router.push({ pathname: '/jobs/[slug]', params: { slug: job.slug } })}>
      <View style={styles.top}>
        <View style={[styles.logo, { backgroundColor: theme.infoSoft }]}>
          <ThemedText style={[styles.logoText, { color: theme.info }]}>
            {(job.company.trim()[0] ?? '?').toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText type="heading" numberOfLines={2}>
            {job.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {job.company} · {timeAgo(job.listedAt ?? job._creationTime)}
          </ThemedText>
        </View>
        <BookmarkIcon resourceType="job" resourceId={job._id} isBookmarked={job.isBookmarked} />
      </View>

      <View style={styles.meta}>
        <Meta icon="location-outline" text={locationLabel(job)} />
        {job.workMode ? <Meta icon="laptop-outline" text={workModeLabel(job.workMode)} /> : null}
      </View>

      <View style={styles.bottom}>
        <View style={styles.badges}>
          {pending ? <Badge label="En attente" tone="warning" icon="time-outline" /> : null}
          <Badge label={jobTypeLabel(job.type)} tone="primary" />
          {contract ? <Badge label={contract} /> : null}
        </View>
        {job.salary !== undefined ? (
          <ThemedText type="smallBold" themeColor="primaryText" numberOfLines={1}>
            {salaryLabel(job.salary, job.salaryPeriod)}
          </ThemedText>
        ) : null}
      </View>
    </Card>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
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
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  logo: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, lineHeight: 22, fontWeight: 800 },
  flex: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.one },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, maxWidth: '100%' },
  metaText: { flexShrink: 1 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, flexShrink: 1 },
});
