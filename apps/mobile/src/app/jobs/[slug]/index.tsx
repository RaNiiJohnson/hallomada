import { api } from '@convex/_generated/api';
import { useAction, useConvexAuth, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import { BookmarkButton } from '@/components/bookmark-button';
import { Button } from '@/components/button';
import { CenteredMessage, FactList, PendingBanner, Section } from '@/components/detail';
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

  if (job === undefined) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (job === null) {
    return (
      <CenteredMessage
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

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: job.company }} />
      <ScrollView contentContainerStyle={styles.content}>
        {job.status === 'pending' ? (
          <PendingBanner
            title="Offre en attente de validation"
            description="Visible uniquement par vous et les administrateurs jusqu’à sa validation."
          />
        ) : null}

        <View style={styles.header}>
          <ThemedText type="subtitle">{job.title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {job.company} · {locationLabel(job)}
          </ThemedText>
          {job.authorName ? (
            <ThemedText type="small" themeColor="textSecondary">
              Publiée par {job.authorName}
            </ThemedText>
          ) : null}
        </View>

        <ApplySection job={job} />

        <FactList facts={facts} />

        <Section title="Description du poste" body={job.description} />
        {job.benefits ? <Section title="Avantages" body={job.benefits} /> : null}
        {job.certificates?.length ? (
          <Section title="Certificats requis" body={job.certificates.map((c) => `• ${c}`).join('\n')} />
        ) : null}

        <View style={styles.apply}>
          <BookmarkButton resourceType="job" resourceId={job._id} isBookmarked={job.isBookmarked} />
          <Button label="Partager" onPress={share} />
        </View>
      </ScrollView>
    </ThemedView>
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
  if (user?._id === job.authorId) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Vous avez publié cette offre. Les candidatures reçues sont visibles sur le site.
      </ThemedText>
    );
  }

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
    primary = <Button label="Candidatures closes" onPress={() => {}} disabled />;
  } else if (!isAuthenticated) {
    primary = (
      <Button label="Se connecter pour postuler" primary onPress={() => router.navigate('/account')} />
    );
  } else if (status === 'failed') {
    primary = <Button label="Renvoyer la candidature" loading={retrying} onPress={retryEmail} />;
  } else if (status === undefined) {
    primary = <Button label="Postuler" onPress={() => {}} loading />;
  } else if (status !== 'none') {
    primary = <Button label="Candidature déjà envoyée" onPress={() => {}} disabled />;
  } else {
    primary = (
      <Button
        label="Postuler"
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
          onPress={() => WebBrowser.openBrowserAsync(externalUrl)}
        />
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: Spacing.five },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.one },
  apply: { gap: Spacing.two },
});
