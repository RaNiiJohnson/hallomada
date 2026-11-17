export type ProviderCategory =
  | 'food'
  | 'photo'
  | 'beauty'
  | 'events'
  | 'fashion'
  | 'transport'
  | 'lessons'
  | 'digital'
  | 'other';

export type ProviderServiceMode = 'atProvider' | 'atClient' | 'online';

export const providerCategoryLabels: Record<ProviderCategory, string> = {
  food: 'Traiteur & gastronomie',
  photo: 'Photo & vidéo',
  beauty: 'Coiffure & beauté',
  events: 'Événementiel & DJ',
  fashion: 'Couture & mode',
  transport: 'Transport & colis',
  lessons: 'Cours & traduction',
  digital: 'Web & graphisme',
  other: 'Autre',
};

export const serviceModeLabels: Record<ProviderServiceMode, string> = {
  atProvider: 'Chez le prestataire',
  atClient: 'Se déplace chez vous',
  online: 'En ligne',
};

export const providerStatusLabels: Record<string, string> = {
  active: 'Publiée',
  pending: 'En attente de validation',
  rejected: 'Refusée',
  closed: 'Masquée',
  archived: 'Archivée',
};
