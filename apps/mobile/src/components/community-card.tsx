import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { Badge } from './badge';
import { Card } from './card';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

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

export function CommunityCard({ community }: { community: CommunitySummary }) {
  const router = useRouter();
  const focus = community.city ?? community.theme;
  return (
    <Card
      accessibilityLabel={community.name}
      onPress={() =>
        router.push({ pathname: '/communities/[community]', params: { community: community.slug } })
      }>
      <View style={styles.top}>
        <Avatar name={community.name} size={48} />
        <View style={styles.flex}>
          <ThemedText type="heading" numberOfLines={1}>
            {community.name}
          </ThemedText>
          <View style={styles.badges}>
            {focus ? (
              <Badge
                label={focus}
                icon={community.city ? 'location-outline' : 'pricetag-outline'}
                tone={community.city ? 'info' : 'primary'}
              />
            ) : null}
            {community.privacy === 'private' ? <Badge label="Privée" icon="lock-closed-outline" /> : null}
          </View>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {community.description}
      </ThemedText>
      {community.membersCount !== undefined ? (
        <View style={styles.counts}>
          <Count icon="people-outline" value={community.membersCount} label="membre" />
          <Count icon="chatbubbles-outline" value={community.postsCount ?? 0} label="publication" />
        </View>
      ) : null}
    </Card>
  );
}

function Count({ icon, value, label }: { icon: 'people-outline' | 'chatbubbles-outline'; value: number; label: string }) {
  return (
    <View style={styles.count}>
      <Icon name={icon} size={15} themeColor="textSecondary" />
      <ThemedText type="small" themeColor="textSecondary">
        {value} {label}
        {value > 1 ? 's' : ''}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.one },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  counts: { flexDirection: 'row', gap: Spacing.four },
  count: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
