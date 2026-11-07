/** Safe to import from the client (no server code). */
export const MAX_PUBLICATION_QUOTA = 100;

export type QuotaPlan = "free" | "premium";

export type PlanQuotas = {
  jobsPerWeek: number;
  listingsPerWeek: number;
  providersPerMonth: number;
};

/** Used until an administrator saves other numbers. */
export const DEFAULT_PLAN_QUOTAS: Record<QuotaPlan, PlanQuotas> = {
  free: { jobsPerWeek: 3, listingsPerWeek: 3, providersPerMonth: 3 },
  premium: { jobsPerWeek: 10, listingsPerWeek: 10, providersPerMonth: 10 },
};
