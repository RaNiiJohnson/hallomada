import { api } from '@convex/_generated/api';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/badge';
import { BookmarkIcon } from '@/components/bookmark-button';
import { Button } from '@/components/button';
import { Banner, CenteredMessage, LoadingScreen, Panel, PendingBanner } from '@/components/detail';
import { Icon, type IconName } from '@/components/icon';
import { OwnerPanel, ReceivedList } from '@/components/owner-panel';
import { ReportButton } from '@/components/report-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useApplicationQuota } from '@/hooks/use-application-quota';
import { useRecordView } from '@/hooks/use-record-view';
import { useTheme } from '@/hooks/use-theme';
import {
  contractLabel,
  formatDate,
  jobTypeLabel,
  locationLabel,
  salaryPeriodLabel,
  workModeLabel,
} from '@/lib/job-labels';
import { formatEuro } from '@/lib/listing-labels';
import { timeAgo } from '@/lib/time';
import { safeExternalUrl, webUrl } from '@/lib/web';

export default function JobDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const job = useQuery(api.jobs.queries.getJobWithContact, { slug });
  const user = useQuery(api.auth.auth.getCurrentUser);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [now] = useState(() => Date.now());
  useRecordView(job ? { type: 'job', id: job._id } : null);

  if (job === undefined) return <LoadingScreen />;

  if (job === null) {
    return (
      <CenteredMessage
        icon="briefcase-outline"
        title="Offre introuvable"
        description="Elle a peut-être été retirée ou n'est plus visible."
      />
    );
  }

  const share = () => {
    const url = webUrl(`/jobs/${job.slug}`);
    void Share.share(url ? { message: `${job.title}\n${url}`, url } : { message: job.title });
  };

  const isOwner = Boolean(user && user._id === job.authorId);
  const contract = contractLabel(job);
  const place = locationLabel(job);
  const salary =
    job.salary !== undefined ? <Salary amount={job.salary} period={job.salaryPeriod} /> : null;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton icon="share-outline" label="Partager" onPress={share} />
              <BookmarkIcon resourceType="job" resourceId={job._id} isBookmarked={job.isBookmarked} />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, !isOwner && styles.scrollWithBar]}>
        {job.status === 'pending' ? (
          <PendingBanner
            title="Offre en attente de validation"
            description="Visible uniquement par vous et les administrateurs jusqu’à sa validation."
          />
        ) : job.status === 'rejected' ? (
          <Banner tone="danger" icon="close-circle-outline" title="Offre refusée" description="Modifiez-la puis renvoyez-la en validation." />
        ) : null}

        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: `${theme.primary}1A` }]}>
            <Icon name="business-outline" size={32} color={theme.primary} />
          </View>
          <ThemedText style={styles.title}>{job.title}</ThemedText>
          <Byline job={job} isOwner={isOwner} now={now} />
          {job.status === 'closed' ? <Badge label="Clôturée" icon="lock-closed-outline" /> : null}
          <View style={[styles.rule, { backgroundColor: theme.primary }]} />
          <View style={styles.heroMeta}>
            <Meta icon="business-outline" label={job.company} />
            {contract ? <Meta icon="briefcase-outline" label={contract} /> : null}
            <Meta icon="location-outline" label={place} accent />
          </View>
        </View>

        {isOwner ? <OwnerSection job={job} /> : null}

        <Panel title="Aperçu de l’offre" icon="document-text-outline">
          <Fact label="Date de publication" value={formatDate(job._creationTime)} />
          <Fact label="Type d’emploi">
            <Badge label={jobTypeLabel(job.type)} tone="secondary" />
          </Fact>
          {salary ? <Fact label="Salaire">{salary}</Fact> : null}
          <Fact label="Mode de travail" value={job.workMode && workModeLabel(job.workMode)} />
          <Fact label="Localisation" value={place} />
          {contract ? (
            <Fact label="Type de contrat">
              <Outline label={contract} />
            </Fact>
          ) : null}
          <Fact label="Secteur / catégorie" value={job.sector} />
          <Fact label="Durée" value={job.duration} />
          <Fact label="Date de début" value={job.startDate && formatDate(job.startDate)} />
          <Fact
            label="Volume horaire"
            value={job.weeklyHours !== undefined ? `${job.weeklyHours} h / semaine` : undefined}
          />
          <Fact label="Date limite de candidature" value={job.applicationDeadline && formatDate(job.applicationDeadline)} />
          <Fact label="Formation requise" value={job.trainingRequirements} />
        </Panel>

        <Panel title="Description du poste">
          <ThemedText style={styles.body}>{job.description}</ThemedText>
        </Panel>

        {job.benefits ? (
          <Panel title="Avantages">
            <ThemedText style={styles.body}>{job.benefits}</ThemedText>
          </Panel>
        ) : null}

        {job.certificates?.length ? (
          <Panel title="Certificats requis" icon="ribbon-outline">
            <View style={styles.chips}>
              {job.certificates.map((certificate) => (
                <Badge key={certificate} label={certificate} tone="secondary" />
              ))}
            </View>
          </Panel>
        ) : null}

        <Panel title="Informations sur l’entreprise">
          <View style={styles.company}>
            <View style={[styles.companyIcon, { backgroundColor: `${theme.primary}1A` }]}>
              <Icon name="business-outline" size={28} color={theme.primary} />
            </View>
            <View style={styles.flex}>
              <ThemedText style={styles.companyName}>{job.company}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {place}
              </ThemedText>
            </View>
          </View>
        </Panel>

        <Panel title="Résumé rapide" muted>
          <View style={styles.chips}>
            <Badge label={jobTypeLabel(job.type)} tone="secondary" />
            {contract ? <Chip icon="briefcase-outline" label={contract} /> : null}
            <Chip icon="location-outline" label={place} />
          </View>
          <View>
            {job.duration ? <SummaryRow label="Durée">
              <ThemedText type="smallBold">{job.duration}</ThemedText>
            </SummaryRow> : null}
            {salary ? <SummaryRow label="Salaire">{salary}</SummaryRow> : null}
            <SummaryRow label="Publié" last>
              <ThemedText type="smallBold">{timeAgo(job._creationTime, now)}</ThemedText>
            </SummaryRow>
          </View>
        </Panel>

        {isOwner ? null : (
          <View style={styles.report}>
            <ReportButton type="job" id={job._id} title={job.title} />
          </View>
        )}
      </ScrollView>

      {isOwner ? null : (
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.two) + Spacing.one,
            },
          ]}>
          <View style={styles.barInner}>
            <ApplySection job={job} />
          </View>
        </View>
      )}
    </ThemedView>
  );
}

/** "X a publié cette offre il y a …", the author opening their profile. */
function Byline({ job, isOwner, now }: { job: Job; isOwner: boolean; now: number }) {
  const router = useRouter();
  const when = timeAgo(job._creationTime, now);
  const name = job.authorName || 'Anonyme';
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
      {isOwner ? (
        <ThemedText type="smallBold">Vous</ThemedText>
      ) : (
        <ThemedText
          type="smallBold"
          onPress={
            job.authorSlug
              ? () => router.push({ pathname: '/profiles/[slug]', params: { slug: job.authorSlug! } })
              : undefined
          }>
          {name}
        </ThemedText>
      )}
      {isOwner ? ' avez publié cette offre ' : ' a publié cette offre '}
      {when}
    </ThemedText>
  );
}

function Meta({ icon, label, accent }: { icon: IconName; label: string; accent?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={16} color={accent ? theme.primary : theme.textSecondary} />
      <ThemedText type="smallBold">{label}</ThemedText>
    </View>
  );
}

function Fact({ label, value, children }: { label: string; value?: string | null; children?: ReactNode }) {
  if (!children && !value) return null;
  return (
    <View style={styles.fact}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children ?? <ThemedText style={styles.factValue}>{value}</ThemedText>}
    </View>
  );
}

function Salary({ amount, period }: { amount: number; period?: Job['salaryPeriod'] }) {
  const theme = useTheme();
  return (
    <View style={styles.salary}>
      <ThemedText style={styles.factValue}>{formatEuro(amount)}</ThemedText>
      {period ? (
        <ThemedText type="caption" style={{ color: theme.primary }}>
          /{salaryPeriodLabel(period)}
        </ThemedText>
      ) : null}
    </View>
  );
}

function Outline({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.outline, { borderColor: theme.border }]}>
      <ThemedText type="caption" style={styles.bold}>
        {label}
      </ThemedText>
    </View>
  );
}

function Chip({ icon, label }: { icon: IconName; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.background }]}>
      <Icon name={icon} size={14} color={theme.textSecondary} />
      <ThemedText type="caption" themeColor="textSecondary" style={styles.bold} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

function SummaryRow({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.summaryRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={styles.iconButton}>
      <Icon name={icon} size={20} themeColor="text" />
    </Pressable>
  );
}

function OwnerSection({ job }: { job: Job }) {
  const router = useRouter();
  const setStatus = useMutation(api.jobs.mutations.setJobStatus);
  const archive = useMutation(api.jobs.mutations.deleteJob);
  const applications = useQuery(api.jobs.queries.listReceivedApplications, { jobId: job._id });
  return (
    <>
      <OwnerPanel
        noun="offre"
        status={job.status}
        onEdit={() => router.push({ pathname: '/jobs/[slug]/edit', params: { slug: job.slug } })}
        onSetStatus={(next) =>
          next === 'archived' ? archive({ id: job._id }) : setStatus({ id: job._id, status: next })
        }
      />
      <ReceivedList
        title="Candidatures reçues"
        empty="Aucune candidature pour le moment."
        closedHint="CV expiré ou non fourni."
        rows={applications?.map((row) => ({
          _id: row._id,
          name: row.candidateName,
          slug: row.candidateSlug,
          at: row.appliedAt,
          highlighted: row.highlighted,
          message: row.coverLetter,
          link: row.cvUrl ? { label: 'Voir le CV', url: row.cvUrl, icon: 'document-attach-outline' } : null,
        }))}
      />
    </>
  );
}

type Job = NonNullable<ReturnType<typeof useQuery<typeof api.jobs.queries.getJobWithContact>>>;

function ApplySection({ job }: { job: Job }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const status = useQuery(
    api.jobs.queries.hasCurrentUserAppliedToJob,
    isAuthenticated ? { jobId: job._id } : 'skip',
  );
  const quota = useApplicationQuota();
  const retry = useAction(api.jobs.actions.retryApplicationEmail);
  const [retrying, setRetrying] = useState(false);

  if (isLoading || user === undefined) return null;

  const accepting = job.status === undefined || job.status === 'active';
  const externalUrl = safeExternalUrl(job.externalApplicationUrl);
  const quotaReached = quota != null && quota.limit !== null && quota.remaining === 0;

  const retryEmail = async () => {
    setRetrying(true);
    try {
      await retry({ jobId: job._id, locale: 'fr' });
      Alert.alert('Candidature renvoyée', 'La candidature a bien été renvoyée.');
    } catch (error) {
      const limit = error instanceof ConvexError && error.data?.code === 'LIMIT_REACHED';
      Alert.alert(
        'Échec',
        limit
          ? 'Vous avez déjà renvoyé cette candidature plusieurs fois aujourd’hui. Réessayez demain.'
          : 'Le nouvel envoi a échoué. Réessayez plus tard.',
      );
    } finally {
      setRetrying(false);
    }
  };

  let primary;
  if (!accepting) {
    primary = <Button label="Candidatures closes" icon="lock-closed-outline" size="md" onPress={() => {}} disabled />;
  } else if (!isAuthenticated) {
    primary = (
      <Button label="Se connecter pour postuler" icon="log-in-outline" size="md" primary onPress={() => router.navigate('/account')} />
    );
  } else if (status === 'failed') {
    primary = <Button label="Renvoyer la candidature" icon="refresh-outline" size="md" variant="outline" loading={retrying} onPress={retryEmail} />;
  } else if (status === undefined) {
    primary = <Button label="Postuler" size="md" onPress={() => {}} loading />;
  } else if (status !== 'none') {
    primary = <Button label="Candidature envoyée" icon="checkmark-circle-outline" size="md" onPress={() => {}} disabled />;
  } else {
    primary = (
      <Button
        label="Postuler"
        icon="paper-plane-outline"
        size="md"
        primary
        disabled={quotaReached}
        onPress={() =>
          router.push({ pathname: '/jobs/[slug]/apply', params: { slug: job.slug } })
        }
      />
    );
  }

  return (
    <View style={styles.apply}>
      {primary}
      {accepting && status === 'none' && quotaReached ? (
        <ThemedText type="small" themeColor="textSecondary">
          Vous avez utilisé toutes vos candidatures gratuites ce mois-ci.
        </ThemedText>
      ) : null}
      {accepting && externalUrl ? (
        <Button
          label="Postuler sur le site externe"
          icon="open-outline"
          variant="outline"
          onPress={() => WebBrowser.openBrowserAsync(externalUrl)}
        />
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  scrollWithBar: { paddingBottom: 120 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  bold: { fontWeight: 600 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.two },
  logo: { width: 64, height: 64, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: 700, textAlign: 'center' },
  rule: { width: 80, height: 4, borderRadius: 2 },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: Spacing.four,
    rowGap: Spacing.two,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  fact: { gap: 4, alignItems: 'flex-start' },
  factValue: { fontWeight: 600 },
  salary: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  outline: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    maxWidth: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  body: { lineHeight: 24 },
  company: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  companyIcon: { padding: Spacing.two + Spacing.one, borderRadius: Radius.md },
  companyName: { fontSize: 18, lineHeight: 24, fontWeight: 600 },
  report: { alignItems: 'center' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  barInner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  apply: { gap: Spacing.two },
});
