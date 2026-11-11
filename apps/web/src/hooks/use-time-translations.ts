import { useTranslations } from "next-intl";

export function useTimeTranslations() {
  const t = useTranslations("time");

  return {
    now: t("now"),
    instant: t("instant"),
    ago: t("ago"),
    at: t("at"),
    year: t("year"),
    years: t("years"),
    month: t("month"),
    months: t("months"),
    day: t("day"),
    days: t("days"),
    hour: t("hour"),
    hours: t("hours"),
    minute: t("minute"),
    minutes: t("minutes"),
    second: t("second"),
    seconds: t("seconds"),
    week: t("week"),
    weeks: t("weeks"),
  };
}
