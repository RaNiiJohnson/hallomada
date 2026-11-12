import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { api } from '@convex/_generated/api';

import { Badge } from './badge';
import { Card } from './card';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  areaLabel,
  listingModeLabel,
  placeLabel,
  priceLabel,
  propertyTypeLabel,
} from '@/lib/listing-labels';

type Listing = FunctionReturnType<typeof api.listings.queries.getListing>['page'][number];

export function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const theme = useTheme();
  const cover = listing.images.find((image) => image.url)?.url;

  return (
    <Card
      padded={false}
      accessibilityLabel={listing.title}
      onPress={() => router.push({ pathname: '/listings/[slug]', params: { slug: listing.slug } })}>
      <View style={[styles.imageWrapper, { backgroundColor: theme.muted }]}>
        {cover ? (
          <Image source={cover} style={styles.image} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="image-outline" size={36} themeColor="textSecondary" />
          </View>
        )}
        <View style={styles.badges}>
          <Badge label={listingModeLabel(listing.listingMode)} tone="primary" />
          <Badge label={propertyTypeLabel(listing.propertyType)} />
        </View>
        {listing.images.length > 1 ? (
          <View style={styles.count}>
            <Icon name="images-outline" size={12} color="#fff" />
            <ThemedText type="caption" style={styles.countText}>
              {listing.images.length}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <ThemedText type="heading" themeColor="primaryText">
          {priceLabel(listing.price, listing.listingMode)}
        </ThemedText>
        <ThemedText type="smallBold" numberOfLines={1}>
          {listing.title}
        </ThemedText>
        <View style={styles.row}>
          <Icon name="location-outline" size={14} themeColor="textSecondary" />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
            {placeLabel(listing)}
          </ThemedText>
        </View>
        <View style={styles.facts}>
          <Fact icon="resize-outline" text={areaLabel(listing.area)} />
          {listing.bedrooms > 0 ? <Fact icon="bed-outline" text={`${listing.bedrooms} ch.`} /> : null}
          {listing.bathrooms > 0 ? <Fact icon="water-outline" text={`${listing.bathrooms} sdb`} /> : null}
        </View>
      </View>
    </Card>
  );
}

function Fact({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={14} themeColor="textSecondary" />
      <ThemedText type="small" themeColor="textSecondary">
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrapper: { aspectRatio: 16 / 10 },
  image: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', top: Spacing.two, left: Spacing.two, flexDirection: 'row', gap: Spacing.one },
  count: {
    position: 'absolute',
    bottom: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#0009',
  },
  countText: { color: '#fff' },
  body: { padding: Spacing.three, gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  facts: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.half },
});
