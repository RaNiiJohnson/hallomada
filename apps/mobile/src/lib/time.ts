const relative = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

const steps: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "il y a 3 heures", "hier"… relative to now. */
export function timeAgo(timestamp: number, now = Date.now()) {
  const seconds = Math.round((timestamp - now) / 1000);
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'à l’instant';
}
