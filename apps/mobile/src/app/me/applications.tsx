import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';

import { ListRow } from '@/components/list-row';
import { PaginatedList } from '@/components/paginated-list';
import { formatDate } from '@/lib/job-labels';

const PAGE_SIZE = 20;
const statusLabels: Record<string, string> = {
  pending: 'Envoi en cours',
  sent: 'Envoyée',
  delivered: 'Envoyée',
  failed: 'Échec de l’envoi',
  bounced: 'Échec de l’envoi',
};

export default function ApplicationsScreen() {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(
    api.me.queries.getMyApplications,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <PaginatedList
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty={{ icon: 'paper-plane-outline', title: 'Aucune candidature', description: 'Les offres auxquelles vous postulez apparaîtront ici avec leur suivi.' }}
      renderItem={(application) => {
        const job = application.job;
        return (
          <ListRow
            title={job?.title ?? 'Offre supprimée'}
            subtitle={job?.company}
            meta={`${formatDate(application.appliedAt)} · ${statusLabels[application.emailStatus] ?? application.emailStatus}`}
            onPress={
              job
                ? () => router.push({ pathname: '/jobs/[slug]', params: { slug: job.slug } })
                : undefined
            }
          />
        );
      }}
    />
  );
}
