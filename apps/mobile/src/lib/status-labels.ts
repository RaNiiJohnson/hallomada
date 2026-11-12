/** Moderation lifecycle shared by jobs, listings and provider pages. */
export const publicationStatusLabels: Record<string, string> = {
  pending: 'En attente de validation',
  active: 'Publiée',
  rejected: 'Refusée',
  closed: 'Clôturée',
  archived: 'Archivée',
};
