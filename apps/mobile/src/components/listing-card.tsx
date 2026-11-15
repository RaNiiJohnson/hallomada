import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Badge } from './badge';
import { BookmarkIcon } from './bookmark-button';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatEuro, propertyTypeLabel } from '@/lib/listing-labels';

type Listing = FunctionReturnType<typeof api.listings.queries.getListing>['page'][number];

/**
 * Same card as the web list: a tall photo with the type badge, the bookmark,
 * and a floating panel at the bottom with title, city and the price in green.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const theme = useTheme();
  const cover = listing.images.find((image) => image.url)?.url;

  return (
    <View style={[styles.card, { backgroundColor: theme.muted, shadowColor: theme.shadow }]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={listing.title}
        onPress={() => router.push({ pathname: '/listings/[slug]', params: { slug: listing.slug } })}
        style={({ pressed }) => [styles.fill, pressed && styles.pressed]}>
        {cover ? (
          <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="image-outline" size={36} themeColor="textSecondary" />
          </View>
        )}
        <View style={styles.badges}>
          <Badge tone="solid" label={propertyTypeLabel(listing.propertyType)} />
          {listing.status === 'pending' ? <Badge tone="warning" label="En attente" /> : null}
        </View>
        <View style={[styles.panel, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText numberOfLines={1} style={styles.title}>
            {listing.title}
          </ThemedText>
          <View style={styles.place}>
            <Icon name="location-outline" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {listing.city}
            </ThemedText>
          </View>
          <ThemedText style={[styles.price, { color: theme.primary }]}>
            {formatEuro(listing.price)}
            {listing.listingMode === 'rent' ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.per}>
                {' '}
                /mois
              </ThemedText>
            ) : null}
          </ThemedText>
        </View>
      </Pressable>
      <View style={styles.bookmark}>
        <BookmarkIcon overlay resourceType="realEstate" resourceId={listing._id} isBookmarked={listing.isBookmarked} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 320,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fill: { flex: 1 },
  pressed: { opacity: 0.9 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', top: Spacing.two, left: Spacing.two, gap: Spacing.one },
  bookmark: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  panel: {
    position: 'absolute',
    left: Spacing.two + Spacing.one,
    right: Spacing.two + Spacing.one,
    bottom: Spacing.two + Spacing.one,
    padding: Spacing.two + Spacing.one,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  title: { fontWeight: 600 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.one },
  price: { fontWeight: 700 },
  per: { fontWeight: 400 },
});
