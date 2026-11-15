import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { BookmarkIcon } from './bookmark-button';
import { Card } from './card';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { areaLabel, placeLabel, priceLabel, propertyTypeLabel } from '@/lib/listing-labels';

type Listing = FunctionReturnType<typeof api.listings.queries.getListing>['page'][number];

/** Photo first, then price, title and one line of essentials. */
export function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const theme = useTheme();
  const cover = listing.images.find((image) => image.url)?.url;
  const essentials = [
    propertyTypeLabel(listing.propertyType),
    areaLabel(listing.area),
    listing.bedrooms > 0 ? `${listing.bedrooms} ch.` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card
      padded={false}
      accessibilityLabel={listing.title}
      overlay={
        <BookmarkIcon overlay resourceType="realEstate" resourceId={listing._id} isBookmarked={listing.isBookmarked} />
      }
      onPress={() => router.push({ pathname: '/listings/[slug]', params: { slug: listing.slug } })}>
      <View style={[styles.imageWrapper, { backgroundColor: theme.muted }]}>
        {cover ? (
          <Image source={cover} style={styles.image} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="image-outline" size={32} themeColor="textSecondary" />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <ThemedText type="heading">{priceLabel(listing.price, listing.listingMode)}</ThemedText>
        <ThemedText type="small" numberOfLines={1}>
          {listing.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {placeLabel(listing)} · {essentials}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  imageWrapper: { aspectRatio: 16 / 10 },
  image: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: Spacing.three, gap: Spacing.half },
});
