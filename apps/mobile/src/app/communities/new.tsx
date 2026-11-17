import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { CommunityForm } from '@/components/community-form';
import { errorMessage } from '@/lib/errors';

export default function NewCommunityScreen() {
  const router = useRouter();
  const create = useMutation(api.communities.mutations.createCommunity);
  return (
    <CommunityForm
      submitLabel="Créer la communauté"
      onSubmit={async (values) => {
        try {
          const { slug } = await create(values);
          router.replace({ pathname: '/communities/[community]', params: { community: slug } });
        } catch (error) {
          Alert.alert('Création impossible', errorMessage(error, 'La création a échoué. Réessayez.'));
        }
      }}
    />
  );
}
