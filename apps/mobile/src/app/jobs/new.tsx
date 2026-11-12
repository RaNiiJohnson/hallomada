import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { LoadingScreen } from '@/components/detail';
import { JobForm } from '@/components/job-form';
import { errorMessage } from '@/lib/errors';

export default function NewJobScreen() {
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const createJob = useMutation(api.jobs.mutations.createJob);

  if (user === undefined) return <LoadingScreen />;
  return (
    <JobForm
      initialEmail={user?.email ?? ''}
      submitLabel="Publier l'offre"
      onSubmit={async (values) => {
        try {
          await createJob(values);
          router.back();
          Alert.alert('Offre envoyée', 'Votre offre a été envoyée à l’administration pour validation.');
        } catch (error) {
          Alert.alert('Erreur', errorMessage(error, "Erreur lors de la création de l'offre."));
        }
      }}
    />
  );
}
