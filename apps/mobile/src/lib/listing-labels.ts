// French labels mirrored from apps/web/messages/fr/listing.json until the
// mobile app gets shared i18n.
export const propertyTypes = {
  room: 'Chambre',
  apartment: 'Appartement',
  house: 'Maison',
  studio: 'Studio',
  shared: 'Colocation',
} as const;

const listingModes = { rent: 'À louer', sale: 'À vendre' } as const;

export type PropertyType = keyof typeof propertyTypes;
export type ListingMode = keyof typeof listingModes;

export function propertyTypeLabel(type: PropertyType) {
  return propertyTypes[type] ?? type;
}

export function listingModeLabel(mode: ListingMode) {
  return listingModes[mode] ?? mode;
}

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatEuro(amount: number) {
  return euro.format(amount);
}

/** "850 € /mois" for rentals, "250 000 €" for sales. */
export function priceLabel(price: number, mode: ListingMode) {
  return mode === 'rent' ? `${euro.format(price)} /mois` : euro.format(price);
}

export function placeLabel(listing: { city: string; neighborhood?: string }) {
  return [listing.neighborhood, listing.city].filter(Boolean).join(', ');
}

export function areaLabel(area: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(area)} m²`;
}
