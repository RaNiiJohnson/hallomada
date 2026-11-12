import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { LoadingScreen } from '@/components/detail';
import { ListingForm } from '@/components/listing-form';
import { errorMessage } from '@/lib/errors';

export default function NewListingScreen() {
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const createListing = useMutation(api.listings.mutations.createListing);

  if (user === undefined) return <LoadingScreen />;
  return (
    <ListingForm
      initialEmail={user?.email ?? ''}
      submitLabel="Publier l'annonce"
      onSubmit={async (values) => {
        try {
          await createListing(values);
          router.back();
          Alert.alert('Annonce envoyée', 'Votre annonce a été envoyée à l’administration pour validation.');
        } catch (error) {
          Alert.alert('Erreur', errorMessage(error, "Erreur lors de la création de l'annonce."));
        }
      }}
    />
  );
}
