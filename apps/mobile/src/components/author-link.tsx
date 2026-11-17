import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { ThemedText } from './themed-text';

/** "Publiée par X" line; opens the author's public profile when it has one. */
export function AuthorLink({
  prefix,
  name,
  slug,
}: {
  prefix: string;
  name?: string | null;
  slug?: string | null;
}) {
  const router = useRouter();
  if (!name) return null;
  const text = (
    <ThemedText type="small" themeColor="textSecondary">
      {prefix} <ThemedText type="small" style={slug ? { textDecorationLine: 'underline' } : undefined}>{name}</ThemedText>
    </ThemedText>
  );
  if (!slug) return text;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/profiles/[slug]', params: { slug } })}>
      {text}
    </Pressable>
  );
}
