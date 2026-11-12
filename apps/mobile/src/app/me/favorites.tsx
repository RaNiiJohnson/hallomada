import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';

import { ListRow } from '@/components/list-row';
import { PaginatedList } from '@/components/paginated-list';
import { openWebPath } from '@/lib/routes';

const PAGE_SIZE = 20;
const typeLabels = { job: 'Offre', realEstate: 'Annonce', post: 'Publication' } as const;

export default function FavoritesScreen() {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(
    api.bookmarks.queries.getMyBookmarks,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <PaginatedList
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty={{ icon: 'bookmark-outline', title: 'Aucun favori', description: 'Touchez le signet d’une offre ou d’une annonce pour la retrouver ici.' }}
      renderItem={(bookmark) => {
        const snapshot = bookmark.snapshot;
        return (
          <ListRow
            title={snapshot?.title ?? 'Élément indisponible'}
            subtitle={[typeLabels[bookmark.resourceType], snapshot?.subtitle]
              .filter(Boolean)
              .join(' · ')}
            onPress={snapshot ? () => openWebPath(router, snapshot.href) : undefined}
          />
        );
      }}
    />
  );
}
