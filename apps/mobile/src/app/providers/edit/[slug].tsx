import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { CenteredMessage, LoadingScreen } from '@/components/detail';
import { ProviderForm } from '@/components/provider-form';

export default function EditProviderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const provider = useQuery(api.providers.queries.getProviderBySlug, { slug });
  const updateProvider = useMutation(api.providers.mutations.updateProvider);

  if (provider === undefined) return <LoadingScreen />;
  if (provider === null || !provider.canManage) {
    return (
      <CenteredMessage
        icon="lock-closed-outline"
        title="Modification impossible"
        description="Seul le créateur de la page peut la modifier."
      />
    );
  }

  return (
    <ProviderForm
      initial={{
        ...provider,
        logo: provider.logo ? { storageId: provider.logo.storageId, url: provider.logoUrl } : undefined,
      }}
      submitLabel="Enregistrer"
      onSubmit={async (values) => {
        await updateProvider({ providerId: provider._id, provider: values });
        router.back();
        Alert.alert('Page modifiée', 'Vos modifications seront visibles après validation.');
      }}
    />
  );
}
