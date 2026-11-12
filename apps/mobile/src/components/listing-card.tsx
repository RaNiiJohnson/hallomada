import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import {
  areaLabel,
  placeLabel,
  priceLabel,
  propertyTypeLabel,
  listingModeLabel,
} from '@/lib/listing-labels';

type Listing = FunctionReturnType<typeof api.listings.queries.getListing>['page'][number];

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.images.find((image) => image.url)?.url;
  const details = [
    propertyTypeLabel(listing.propertyType),
    areaLabel(listing.area),
    listing.bedrooms > 0 ? `${listing.bedrooms} ch.` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link href={{ pathname: '/listings/[slug]', params: { slug: listing.slug } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.imageWrapper}>
            {cover ? (
              <Image source={cover} style={styles.image} contentFit="cover" transition={150} />
            ) : null}
            <ThemedView type="background" style={styles.badge}>
              <ThemedText type="small">{listingModeLabel(listing.listingMode)}</ThemedText>
            </ThemedView>
          </View>
          <View style={styles.body}>
            <ThemedText type="smallBold">{priceLabel(listing.price, listing.listingMode)}</ThemedText>
            <ThemedText type="small" numberOfLines={1}>
              {listing.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {placeLabel(listing)} · {details}
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, overflow: 'hidden' },
  imageWrapper: { aspectRatio: 16 / 10, backgroundColor: '#8884' },
  image: { flex: 1 },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  body: { padding: Spacing.three, gap: Spacing.half },
  pressed: { opacity: 0.7 },
});
