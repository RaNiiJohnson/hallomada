import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useConvexAuth, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from './button';

type Resource =
  | { resourceType: 'job'; resourceId: Id<'JobOffer'> }
  | { resourceType: 'realEstate'; resourceId: Id<'RealestateListing'> }
  | { resourceType: 'post'; resourceId: Id<'posts'> };

export function BookmarkButton({ isBookmarked, ...resource }: Resource & { isBookmarked: boolean }) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const toggle = useMutation(api.bookmarks.mutations.toggleBookmark);
  const [pending, setPending] = useState(false);

  const onPress = async () => {
    if (!isAuthenticated) {
      router.navigate('/account');
      return;
    }
    setPending(true);
    try {
      await toggle(resource);
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le favori.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      label={isBookmarked ? 'Sauvegardé' : 'Sauvegarder'}
      icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
      variant={isBookmarked ? 'outline' : 'secondary'}
      loading={pending}
      onPress={onPress}
    />
  );
}
