import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useConvexAuth, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { Button } from './button';
import { Icon } from './icon';
import { useTheme } from '@/hooks/use-theme';

type Resource =
  | { resourceType: 'job'; resourceId: Id<'JobOffer'> }
  | { resourceType: 'realEstate'; resourceId: Id<'RealestateListing'> }
  | { resourceType: 'post'; resourceId: Id<'posts'> };

function useToggleBookmark(resource: Resource) {
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

  return { pending, onPress };
}

export function BookmarkButton({ isBookmarked, ...resource }: Resource & { isBookmarked: boolean }) {
  const { pending, onPress } = useToggleBookmark(resource as Resource);
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

/** Round bookmark toggle for list cards. `overlay` gives it a solid background on top of photos. */
export function BookmarkIcon({
  isBookmarked,
  overlay,
  ...resource
}: Resource & { isBookmarked: boolean; overlay?: boolean }) {
  const theme = useTheme();
  const { pending, onPress } = useToggleBookmark(resource as Resource);
  const color = isBookmarked ? theme.text : overlay ? theme.text : theme.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      accessibilityState={{ selected: isBookmarked, busy: pending }}
      hitSlop={8}
      disabled={pending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        overlay && { backgroundColor: theme.card },
        pressed && styles.pressed,
      ]}>
      {pending ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Icon name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={color} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
