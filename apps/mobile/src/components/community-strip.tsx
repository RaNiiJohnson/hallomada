import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STRIP_SIZE = 8;

function kindIcon(kind?: 'city' | 'theme'): IconName {
  if (kind === 'city') return 'location-outline';
  if (kind === 'theme') return 'pricetag-outline';
  return 'people-outline';
}

/** Horizontal row of community pills, like the strip above the web feed. */
export function CommunityStrip({ onExplore }: { onExplore: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const { results } = usePaginatedQuery(
    api.communities.queries.getCommunitiesPreview,
    {},
    { initialNumItems: STRIP_SIZE },
  );

  if (results.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}>
      {results.slice(0, STRIP_SIZE).map((community) => (
        <Pressable
          key={community._id}
          accessibilityRole="link"
          accessibilityLabel={community.name}
          onPress={() =>
            router.push({ pathname: '/communities/[community]', params: { community: community.slug } })
          }
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: theme.card, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <Icon name={kindIcon(community.kind)} size={16} color={theme.primary} />
          <ThemedText type="small" numberOfLines={1} style={styles.name}>
            {community.name}
          </ThemedText>
          <Icon name="people-outline" size={13} color={theme.textSecondary} />
          <ThemedText type="caption" themeColor="textSecondary">
            {community.membersCount ?? 0}
          </ThemedText>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onExplore}
        style={({ pressed }) => [styles.explore, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: theme.primary, fontWeight: 600 }}>
          Explorer
        </ThemedText>
        <Icon name="arrow-forward" size={14} color={theme.primary} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed to the screen edges so the pills scroll under the side padding.
  scroll: { marginHorizontal: -Spacing.three },
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  name: { fontWeight: 500, maxWidth: 176 },
  explore: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: Spacing.two },
  pressed: { opacity: 0.7 },
});
