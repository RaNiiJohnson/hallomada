import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { CenteredMessage, LoadingScreen } from '@/components/detail';
import { JobForm } from '@/components/job-form';
import { errorMessage } from '@/lib/errors';

export default function EditJobScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const job = useQuery(api.jobs.queries.getJobWithContact, { slug });
  const contact = useQuery(api.jobs.queries.getJobContactForEdit, job ? { id: job._id } : 'skip');
  const updateJob = useMutation(api.jobs.mutations.updateJob);

  if (job === undefined || (job && contact === undefined)) return <LoadingScreen />;
  if (job === null || contact === null) {
    return <CenteredMessage icon="lock-closed-outline" title="Modification impossible" description="Seul l’auteur peut modifier cette offre." />;
  }

  return (
    <JobForm
      initial={job}
      initialEmail={contact?.email ?? ''}
      submitLabel="Enregistrer"
      onSubmit={async (values) => {
        try {
          await updateJob({ id: job._id, ...values, certificates: job.certificates });
          router.back();
          Alert.alert('Offre modifiée', 'Vos modifications seront visibles après validation.');
        } catch (error) {
          Alert.alert('Erreur', errorMessage(error, 'La modification a échoué.'));
        }
      }}
    />
  );
}
