import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { CommunityForm } from '@/components/community-form';
import { CenteredMessage, LoadingScreen } from '@/components/detail';
import { errorMessage } from '@/lib/errors';

export default function EditCommunityScreen() {
  const { community: slug } = useLocalSearchParams<{ community: string }>();
  const router = useRouter();
  const community = useQuery(api.communities.queries.getCommunityDetails, { slug });
  const update = useMutation(api.communities.mutations.updateCommunity);

  if (community === undefined) return <LoadingScreen />;
  if (community === null) return <CenteredMessage title="Communauté introuvable" />;

  return (
    <CommunityForm
      initial={community}
      submitLabel="Enregistrer"
      onSubmit={async (values) => {
        try {
          await update({ id: community._id, privacy: community.privacy, ...values });
          router.back();
        } catch (error) {
          Alert.alert('Modification impossible', errorMessage(error, 'La modification a échoué.'));
        }
      }}
    />
  );
}
