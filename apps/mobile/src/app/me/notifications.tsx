import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { ListRow } from '@/components/list-row';
import { PaginatedList } from '@/components/paginated-list';
import { ThemedText } from '@/components/themed-text';
import { openWebPath } from '@/lib/routes';
import { timeAgo } from '@/lib/time';

const PAGE_SIZE = 20;

// Mirrored from apps/web/messages/fr/notifications.json.
const messages: Record<Doc<'notifications'>['type'], string> = {
  new_comment: '{name} a commenté votre publication',
  new_reply: '{name} a répondu à votre commentaire',
  new_like: '{name} a aimé votre publication',
  new_comment_like: '{name} a aimé votre commentaire',
  new_reply_like: '{name} a aimé votre réponse',
  new_member: '{name} a rejoint votre communauté',
  leave_community: '{name} a quitté votre communauté',
  job_approved: 'Votre offre « {title} » a été validée et publiée',
  job_rejected: 'Votre offre « {title} » a été refusée',
  listing_approved: 'Votre annonce « {title} » a été validée et publiée',
  listing_rejected: 'Votre annonce « {title} » a été refusée',
  job_pending_review: 'Nouvelle offre « {title} » soumise par {name}',
  listing_pending_review: 'Nouvelle annonce logement « {title} » soumise par {name}',
  provider_approved: 'Votre page prestataire « {title} » a été validée et publiée',
  provider_rejected: 'Votre page prestataire « {title} » a été refusée',
  provider_pending_review: 'Nouvelle page prestataire « {title} » soumise par {name}',
  job_contact_bounced:
    'L’e-mail de contact de votre offre « {title} » ne fonctionne pas : les candidatures ne vous parviennent pas. Modifiez-le.',
  rental_file_received: '{name} vous a envoyé son dossier de location pour « {title} »',
};

export function notificationText(notification: Doc<'notifications'>) {
  return (messages[notification.type] ?? 'Nouvelle activité')
    .replace('{name}', notification.fromUserName ?? 'Quelqu’un')
    .replace('{title}', notification.message ?? 'Votre annonce');
}

function notificationPath(notification: Doc<'notifications'>) {
  return (
    notification.targetHref ??
    (notification.communitySlug && notification.postSlug
      ? `/communities/${notification.communitySlug}/${notification.postSlug}`
      : '/communities')
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const markAllRead = useMutation(api.notifications.mutations.markAllRead);
  const markOneRead = useMutation(api.notifications.mutations.markOneRead);
  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.queries.getMyNotificationsPage,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={() => void markAllRead()}>
              <ThemedText type="small">Tout lire</ThemedText>
            </Pressable>
          ),
        }}
      />
      <PaginatedList
        results={results}
        status={status}
        loadMore={loadMore}
        pageSize={PAGE_SIZE}
        empty={{ icon: 'notifications-outline', title: 'Aucune notification', description: 'Vous serez prévenu ici des candidatures, dossiers et réponses.' }}
        renderItem={(notification) => (
          <ListRow
            title={notificationText(notification)}
            meta={timeAgo(notification._creationTime)}
            highlighted={!notification.read}
            onPress={() => {
              if (!notification.read) void markOneRead({ notificationId: notification._id });
              openWebPath(router, notificationPath(notification));
            }}
          />
        )}
      />
    </>
  );
}
