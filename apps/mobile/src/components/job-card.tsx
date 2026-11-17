import type { FunctionReturnType } from 'convex/server';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Badge } from './badge';
import { BookmarkIcon } from './bookmark-button';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { contractLabel, jobTypeLabel, locationLabel, salaryPeriodLabel } from '@/lib/job-labels';
import { formatEuro } from '@/lib/listing-labels';
import { timeAgo } from '@/lib/time';

type Job = FunctionReturnType<typeof api.jobs.queries.getJobs>['page'][number];

/**
 * Same layout as the web list: title, salary with its period in green,
 * place and type, contract chips; time and bookmark in the right column.
 */
export function JobCard({ job }: { job: Job }) {
  const router = useRouter();
  const theme = useTheme();
  const pending = job.status === 'pending';
  const contract = contractLabel(job);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: pending ? theme.warningSoft : theme.cardSubtle,
          borderColor: pending ? theme.warning : theme.border,
        },
      ]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={job.title}
        onPress={() => router.push({ pathname: '/jobs/[slug]', params: { slug: job.slug } })}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <ThemedText numberOfLines={1} style={styles.title}>
          {job.title}
        </ThemedText>
        {job.salary !== undefined ? (
          <View style={styles.salary}>
            <ThemedText type="smallBold" style={styles.amount}>
              {formatEuro(job.salary)}
            </ThemedText>
            {job.salaryPeriod ? (
              <ThemedText type="caption" style={{ color: theme.primary }}>
                /{salaryPeriodLabel(job.salaryPeriod)}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Icon name="location-outline" size={15} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {locationLabel(job)}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Icon name="briefcase-outline" size={15} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {jobTypeLabel(job.type)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.badges}>
          {pending ? <Badge label="En attente" tone="warning" /> : null}
          {contract ? <Badge label={contract} tone="secondary" /> : null}
          {job.duration ? <Outline icon="time-outline" label={job.duration} /> : null}
        </View>
      </Pressable>
      <View style={styles.side} pointerEvents="box-none">
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {timeAgo(job._creationTime)}
        </ThemedText>
        <BookmarkIcon resourceType="job" resourceId={job._id} isBookmarked={job.isBookmarked} />
      </View>
    </View>
  );
}

function Outline({ icon, label }: { icon: 'time-outline'; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.outline, { borderColor: theme.border }]}>
      <Icon name={icon} size={12} color={theme.text} />
      <ThemedText type="caption" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  // Right padding keeps the text clear of the time and bookmark column.
  body: { padding: Spacing.three, paddingRight: 104, gap: Spacing.one },
  pressed: { opacity: 0.8 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: 600 },
  salary: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  amount: { fontSize: 15 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.one, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  side: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.two,
    alignItems: 'flex-end',
    gap: Spacing.one,
    maxWidth: 96,
  },
});
