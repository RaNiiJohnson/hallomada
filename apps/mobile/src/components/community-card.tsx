import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from './card';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CommunitySummary = {
  slug: string;
  name: string;
  description: string;
  city?: string;
  theme?: string;
  privacy?: 'public' | 'private' | 'secret';
  membersCount?: number;
  postsCount?: number;
};

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

export function CommunityCard({ community }: { community: CommunitySummary }) {
  const router = useRouter();
  const theme = useTheme();
  const meta = [
    community.city ?? community.theme,
    community.privacy === 'private' ? 'Privée' : undefined,
    community.membersCount !== undefined ? plural(community.membersCount, 'membre') : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card
      accessibilityLabel={community.name}
      onPress={() =>
        router.push({ pathname: '/communities/[community]', params: { community: community.slug } })
      }>
      <View style={styles.top}>
        <View style={[styles.logo, { backgroundColor: theme.muted }]}>
          <Icon name={community.privacy === 'private' ? 'lock-closed' : 'people'} size={20} themeColor="text" />
        </View>
        <View style={styles.flex}>
          <ThemedText type="heading" numberOfLines={1}>
            {community.name}
          </ThemedText>
          {meta ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {meta}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <ThemedText type="small" numberOfLines={2}>
        {community.description}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  logo: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: Spacing.half },
});
