import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ListRow } from '@/components/list-row';
import { PaginatedList } from '@/components/paginated-list';
import { Segmented } from '@/components/segmented';
import { formatDate } from '@/lib/job-labels';
import { priceLabel } from '@/lib/listing-labels';
import { publicationStatusLabels } from '@/lib/status-labels';

const PAGE_SIZE = 20;
type Kind = 'jobs' | 'listings';
const kinds: { value: Kind; label: string }[] = [
  { value: 'jobs', label: 'Mes offres' },
  { value: 'listings', label: 'Mes annonces' },
];

function statusLabel(status: string | undefined) {
  return publicationStatusLabels[status ?? 'active'] ?? status ?? '';
}

export default function PublicationsScreen() {
  const [kind, setKind] = useState<Kind>('jobs');
  const header = <Segmented options={kinds} value={kind} onChange={setKind} />;
  return kind === 'jobs' ? <MyJobs header={header} /> : <MyListings header={header} />;
}

function MyJobs({ header }: { header: React.ReactElement }) {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(
    api.me.queries.getMyJobOffers,
    {},
    { initialNumItems: PAGE_SIZE },
  );
  return (
    <PaginatedList
      header={header}
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty="Vous n'avez publié aucune offre."
      renderItem={(job) => (
        <ListRow
          title={job.title}
          subtitle={`${job.company} · ${statusLabel(job.status)}`}
          meta={formatDate(job._creationTime)}
          onPress={() => router.push({ pathname: '/jobs/[slug]', params: { slug: job.slug } })}
        />
      )}
    />
  );
}

function MyListings({ header }: { header: React.ReactElement }) {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(
    api.me.queries.getMyListings,
    {},
    { initialNumItems: PAGE_SIZE },
  );
  return (
    <PaginatedList
      header={header}
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty="Vous n'avez publié aucune annonce."
      renderItem={(listing) => (
        <ListRow
          title={listing.title}
          subtitle={`${priceLabel(listing.price, listing.listingMode)} · ${statusLabel(listing.status)}`}
          meta={formatDate(listing._creationTime)}
          onPress={() =>
            router.push({ pathname: '/listings/[slug]', params: { slug: listing.slug } })
          }
        />
      )}
    />
  );
}
