/** Safe to import from the client (no server code). */
export const MAX_PUBLICATION_QUOTA = 100;

export type QuotaPlan = "free" | "premium";

/** `null` means unlimited (no monthly quota for that kind). */
export type PlanQuotas = {
  jobsPerMonth: number | null;
  listingsPerMonth: number | null;
  providersPerMonth: number | null;
  /** Applications sent per month: job applications + rental dossiers. */
  applicationsPerMonth: number | null;
};

/** Used until an administrator saves other numbers. */
export const DEFAULT_PLAN_QUOTAS: Record<QuotaPlan, PlanQuotas> = {
  free: {
    jobsPerMonth: 5,
    listingsPerMonth: 5,
    providersPerMonth: 5,
    applicationsPerMonth: 5,
  },
  premium: {
    jobsPerMonth: null,
    listingsPerMonth: null,
    providersPerMonth: null,
    applicationsPerMonth: null,
  },
};
