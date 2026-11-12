// Hermes (Android) has no Intl.RelativeTimeFormat, so French relative times are built by hand.

type Unit = { size: number; one: string; many: string; last?: string; next?: string };

const units: Unit[] = [
  { size: 365 * 24 * 3600, one: 'an', many: 'ans', last: 'l’année dernière', next: 'l’année prochaine' },
  { size: 30 * 24 * 3600, one: 'mois', many: 'mois', last: 'le mois dernier', next: 'le mois prochain' },
  { size: 7 * 24 * 3600, one: 'semaine', many: 'semaines', last: 'la semaine dernière', next: 'la semaine prochaine' },
  { size: 24 * 3600, one: 'jour', many: 'jours', last: 'hier', next: 'demain' },
  { size: 3600, one: 'heure', many: 'heures' },
  { size: 60, one: 'minute', many: 'minutes' },
];

/** "il y a 3 heures", "hier"… relative to now. */
export function timeAgo(timestamp: number, now = Date.now()) {
  const seconds = Math.round((timestamp - now) / 1000);
  for (const unit of units) {
    if (Math.abs(seconds) < unit.size) continue;
    const value = Math.round(seconds / unit.size);
    if (value === -1 && unit.last) return unit.last;
    if (value === 1 && unit.next) return unit.next;
    const count = Math.abs(value);
    const label = `${count} ${count > 1 ? unit.many : unit.one}`;
    return value < 0 ? `il y a ${label}` : `dans ${label}`;
  }
  return 'à l’instant';
}
