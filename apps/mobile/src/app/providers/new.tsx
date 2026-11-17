import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { ProviderForm } from '@/components/provider-form';

export default function NewProviderScreen() {
  const router = useRouter();
  const createProvider = useMutation(api.providers.mutations.createProvider);

  return (
    <ProviderForm
      submitLabel="Créer ma page"
      onSubmit={async (values) => {
        const { slug } = await createProvider(values);
        router.replace({ pathname: '/providers/[slug]', params: { slug } });
        Alert.alert('Page envoyée', 'Votre page sera visible dès qu’un administrateur l’aura validée.');
      }}
    />
  );
}
