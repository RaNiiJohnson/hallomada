import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { CenteredMessage, LoadingScreen } from '@/components/detail';
import { ListingForm } from '@/components/listing-form';
import { errorMessage } from '@/lib/errors';

export default function EditListingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const listing = useQuery(api.listings.queries.getListingWithContact, { slug });
  const updateListing = useMutation(api.listings.mutations.updateListing);

  if (listing === undefined || user === undefined) return <LoadingScreen />;
  if (listing === null || user?._id !== listing.authorId) {
    return <CenteredMessage icon="lock-closed-outline" title="Modification impossible" description="Seul l’auteur peut modifier cette annonce." />;
  }

  return (
    <ListingForm
      initial={listing}
      initialEmail={user.email}
      submitLabel="Enregistrer"
      onSubmit={async ({ contact, charges, deposit, availableFrom, ...patch }) => {
        try {
          await updateListing({
            listingId: listing._id,
            // Without verified access the form never saw the stored contact: keep it.
            contact: listing.contact ? contact : undefined,
            // null clears a value the owner removed.
            patch: { ...patch, charges: charges ?? null, deposit: deposit ?? null, availableFrom: availableFrom ?? null },
          });
          router.back();
          Alert.alert('Annonce modifiée', 'Vos modifications seront visibles après validation.');
        } catch (error) {
          Alert.alert('Erreur', errorMessage(error, 'La modification a échoué.'));
        }
      }}
    />
  );
}
