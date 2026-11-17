import { ConvexError } from 'convex/values';

const knownMessages: [RegExp, string][] = [
  [/Publication quota reached/i, 'Vous avez atteint votre quota de publications.'],
  [/Publication rate limit/i, 'Trop de publications à la suite. Réessayez dans quelques minutes.'],
  [/contact details, GPS coordinates, or an exact address/i,
    'Le texte public ne doit pas contenir de coordonnées, d’adresse exacte ni de position GPS.'],
  [/email address or WhatsApp phone/i, 'Indiquez un e-mail ou un numéro WhatsApp.'],
  [/Invalid contact phone/i, 'Numéro de téléphone invalide.'],
  [/Invalid .*email/i, 'Adresse e-mail invalide.'],
  [/Availability date is required/i, 'La date de disponibilité est requise.'],
  [/Uploaded file type or size/i, 'Photo refusée : format ou taille non autorisés.'],
  [/Too many upload requests/i, 'Trop d’envois de fichiers. Réessayez dans quelques minutes.'],
  [/application deadline must be before/i, 'La date limite doit précéder la date de début.'],
  [/cannot exceed|too long/i, 'Un des textes est trop long.'],
];

/** French message for a failed Convex call, falling back to `fallback`. */
export function errorMessage(error: unknown, fallback: string) {
  const message =
    error instanceof ConvexError
      ? (error.data as { message?: string } | undefined)?.message
      : error instanceof Error
        ? error.message
        : undefined;
  if (!message) return fallback;
  const known = knownMessages.find(([pattern]) => pattern.test(message));
  return known ? known[1] : fallback;
}

/** Parses an optional "AAAA-MM-JJ" field; returns null when it is malformed. */
export function parseDateOnly(value: string): string | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(Date.parse(trimmed))) return null;
  return trimmed;
}

/** Parses an optional number field (accepts "," as decimal separator). */
export function parseNumber(value: string): number | undefined | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return undefined;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}
