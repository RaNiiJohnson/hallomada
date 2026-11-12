import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { StatusBadge } from '@/components/owner-panel';
import { PaginatedList } from '@/components/paginated-list';
import { Segmented } from '@/components/segmented';
import { Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/job-labels';
import { priceLabel } from '@/lib/listing-labels';

const PAGE_SIZE = 20;
type Kind = 'jobs' | 'listings';
const kinds: { value: Kind; label: string }[] = [
  { value: 'jobs', label: 'Mes offres' },
  { value: 'listings', label: 'Mes annonces' },
];

export default function PublicationsScreen() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('jobs');
  const header = (
    <View style={styles.header}>
      <Segmented options={kinds} value={kind} onChange={setKind} />
      <Button
        label={kind === 'jobs' ? 'Publier une offre' : 'Publier une annonce'}
        icon="add"
        primary
        onPress={() => router.push(kind === 'jobs' ? '/jobs/new' : '/listings/new')}
      />
    </View>
  );
  return kind === 'jobs' ? <MyJobs header={header} /> : <MyListings header={header} />;
}

function MyJobs({ header }: { header: React.ReactElement }) {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(api.me.queries.getMyJobOffers, {}, { initialNumItems: PAGE_SIZE });
  return (
    <PaginatedList
      header={header}
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty={{
        icon: 'briefcase-outline',
        title: 'Aucune offre publiée',
        description: 'Vos offres d’emploi apparaîtront ici, avec leur statut et les candidatures reçues.',
      }}
      renderItem={(job) => (
        <ListRow
          icon="briefcase-outline"
          title={job.title}
          subtitle={`${job.company} · ${formatDate(job._creationTime)}`}
          trailing={<StatusBadge status={job.status} />}
          onPress={() => router.push({ pathname: '/jobs/[slug]', params: { slug: job.slug } })}
        />
      )}
    />
  );
}

function MyListings({ header }: { header: React.ReactElement }) {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(api.me.queries.getMyListings, {}, { initialNumItems: PAGE_SIZE });
  return (
    <PaginatedList
      header={header}
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty={{
        icon: 'home-outline',
        title: 'Aucune annonce publiée',
        description: 'Vos annonces immobilières apparaîtront ici, avec les dossiers reçus.',
      }}
      renderItem={(listing) => (
        <ListRow
          icon="home-outline"
          title={listing.title}
          subtitle={`${priceLabel(listing.price, listing.listingMode)} · ${formatDate(listing._creationTime)}`}
          trailing={<StatusBadge status={listing.status} />}
          onPress={() => router.push({ pathname: '/listings/[slug]', params: { slug: listing.slug } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, marginBottom: Spacing.one },
});
