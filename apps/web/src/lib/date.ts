// Temps relatif : "il y a 2 jours", "2 days ago", "vor 2 Tagen"
type TimeTranslations = {
  now: string;
  instant: string;
  ago: string;
  year: string;
  years: string;
  month: string;
  months: string;
  day: string;
  days: string;
  hour: string;
  hours: string;
  minute: string;
  minutes: string;
  second: string;
  seconds: string;
  week: string;
  weeks: string;
};

const plural = (n: number, singular: string, pluralStr: string) =>
  n > 1 ? pluralStr : singular;

const formatAgo = (
  t: TimeTranslations,
  n: number,
  singular: string,
  pluralStr: string,
) => {
  const unit = plural(n, singular, pluralStr);
  if (t.ago === "vor") return `${t.ago} ${n} ${unit}`;
  if (t.ago === "ago") return `${n} ${unit} ${t.ago}`;
  return `${t.ago} ${n} ${unit}`;
};

export const getRelativeTime = (
  date: Date | string | number,
  t: TimeTranslations,
) => {
  const diffInMs = Date.now() - new Date(date).getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 30) return t.instant;
  if (diffInSeconds < 60)
    return formatAgo(t, diffInSeconds, t.second, t.seconds);
  if (diffInMinutes < 60)
    return formatAgo(t, diffInMinutes, t.minute, t.minutes);
  if (diffInHours < 24) return formatAgo(t, diffInHours, t.hour, t.hours);
  if (diffInDays < 7) return formatAgo(t, diffInDays, t.day, t.days);
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return formatAgo(t, weeks, t.week, t.weeks);
  }
  const months = Math.floor(diffInDays / 30);
  if (months < 12) return formatAgo(t, months, t.month, t.months);
  const years = Math.floor(months / 12);
  return formatAgo(t, years, t.year, t.years);
};

// Date longue : "12 janvier 2026", "January 12, 2026", "12. Januar 2026"
export const formatDateLong = (date: Date | string | number, locale: string) =>
  new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// Date avec jour + mois + année — pour les offres d'emploi (fallback = availableNow)
export const formatDateWithFallback = (
  date: number | undefined,
  locale: string,
  fallback: string,
) => {
  if (!date) return fallback;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
};

// Date mois + année seulement : "janvier 2026"
export const formatMonthYear = (
  timestamp: number | null | undefined,
  locale: string,
) => {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
};
