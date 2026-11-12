import { api } from '@convex/_generated/api';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AuthorLink } from '@/components/author-link';
import { BookmarkButton } from '@/components/bookmark-button';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ActionRow, Banner, CenteredMessage, FactList, LoadingScreen, PendingBanner, Section } from '@/components/detail';
import { Icon } from '@/components/icon';
import { OwnerPanel, ReceivedList } from '@/components/owner-panel';
import { ReportButton } from '@/components/report-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useApplicationQuota } from '@/hooks/use-application-quota';
import {
  contractLabel,
  formatDate,
  jobTypeLabel,
  locationLabel,
  salaryLabel,
  workModeLabel,
} from '@/lib/job-labels';
import { safeExternalUrl, webUrl } from '@/lib/web';

export default function JobDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const job = useQuery(api.jobs.queries.getJobWithContact, { slug });
  const user = useQuery(api.auth.auth.getCurrentUser);

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

  const facts: [string, string | undefined][] = [
    ['Publiée le', formatDate(job._creationTime)],
    ['Type', jobTypeLabel(job.type)],
    ['Contrat', contractLabel(job)],
    ['Mode de travail', job.workMode && workModeLabel(job.workMode)],
    ['Localisation', locationLabel(job)],
    ['Salaire', job.salary !== undefined ? salaryLabel(job.salary, job.salaryPeriod) : undefined],
    ['Secteur', job.sector],
    ['Durée', job.duration],
    ['Début', job.startDate && formatDate(job.startDate)],
    ['Volume horaire', job.weeklyHours !== undefined ? `${job.weeklyHours} h / semaine` : undefined],
    ['Date limite', job.applicationDeadline && formatDate(job.applicationDeadline)],
    ['Formation souhaitée', job.trainingRequirements],
  ];

  const share = () => {
    const url = webUrl(`/jobs/${job.slug}`);
    void Share.share(url ? { message: `${job.title}\n${url}`, url } : { message: job.title });
  };

  const isOwner = Boolean(user && user._id === job.authorId);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: job.company }} />
      <ScrollView contentContainerStyle={styles.content}>
        {job.status === 'pending' ? (
          <PendingBanner
            title="Offre en attente de validation"
            description="Visible uniquement par vous et les administrateurs jusqu’à sa validation."
          />
        ) : job.status === 'rejected' ? (
          <Banner tone="danger" icon="close-circle-outline" title="Offre refusée" description="Modifiez-la puis renvoyez-la en validation." />
        ) : null}

        <Card style={styles.hero}>
          <View style={styles.badges}>
            <Badge label={jobTypeLabel(job.type)} tone="primary" icon="briefcase-outline" />
            {job.workMode ? <Badge label={workModeLabel(job.workMode)} tone="info" /> : null}
            {job.status === 'closed' ? <Badge label="Clôturée" icon="lock-closed-outline" /> : null}
          </View>
          <ThemedText type="subtitle">{job.title}</ThemedText>
          <View style={styles.meta}>
            <Icon name="business-outline" size={16} themeColor="textSecondary" />
            <ThemedText themeColor="textSecondary" style={styles.flex}>
              {job.company}
            </ThemedText>
          </View>
          <View style={styles.meta}>
            <Icon name="location-outline" size={16} themeColor="textSecondary" />
            <ThemedText themeColor="textSecondary" style={styles.flex}>
              {locationLabel(job)}
            </ThemedText>
          </View>
          {job.salary !== undefined ? (
            <ThemedText type="heading" themeColor="primaryText">
              {salaryLabel(job.salary, job.salaryPeriod)}
            </ThemedText>
          ) : null}
          <AuthorLink prefix="Publiée par" name={job.authorName} slug={job.authorSlug} />
        </Card>

        {isOwner ? <OwnerSection job={job} /> : <ApplySection job={job} />}

        <ActionRow>
          <BookmarkButton resourceType="job" resourceId={job._id} isBookmarked={job.isBookmarked} />
          <Button label="Partager" icon="share-outline" onPress={share} />
          {isOwner ? null : <ReportButton type="job" id={job._id} title={job.title} />}
        </ActionRow>

        <FactList facts={facts} />

        <Section title="Description du poste" icon="document-text-outline" body={job.description} />
        {job.benefits ? <Section title="Avantages" icon="gift-outline" body={job.benefits} /> : null}
        {job.certificates?.length ? (
          <Section
            title="Certificats requis"
            icon="ribbon-outline"
            body={job.certificates.map((c) => `• ${c}`).join('\n')}
          />
        ) : null}
      </ScrollView>
    </ThemedView>
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
  flex: { flex: 1 },
  hero: { gap: Spacing.two },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  apply: { gap: Spacing.two },
});
