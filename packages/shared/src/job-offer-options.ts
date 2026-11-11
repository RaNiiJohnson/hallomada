export const jobTypeValues = [
  "auPair",
  "training",
  "voluntary",
  "internship",
  "miniJob",
  "job",
  "freelance",
  "scholarship",
] as const;

/**
 * Every contract value that may exist in the database. Only CDI and CDD are
 * offered today (see `selectableContractTypes`); the others are legacy values
 * from older listings that must keep validating and displaying.
 */
export const contractTypeValues = [
  "CDI",
  "CDD",
  "FSJ/FOJ/BFD",
  "fullTime",
  "partTime",
  "freelance",
  "apprenticeship",
] as const;

/** Contracts a poster can pick, and only for the "job" type. */
export const selectableContractTypes = ["CDI", "CDD"] as const;

export const workTimeValues = ["fullTime", "partTime"] as const;

export const workModeValues = ["onSite", "hybrid", "remote"] as const;

export type JobType = (typeof jobTypeValues)[number];
export type ContractType = (typeof contractTypeValues)[number];
export type WorkMode = (typeof workModeValues)[number];
export type WorkTime = (typeof workTimeValues)[number];

/** Only regular jobs have a contract; au pair, internship, etc. are their own thing. */
export function jobTypeHasContract(jobType: JobType) {
  return jobType === "job";
}

/** Job types whose offers always need a start date and a duration. */
const timeBoundJobTypes: readonly JobType[] = [
  "auPair",
  "internship",
  "training",
  "scholarship",
  "freelance",
];

export function requiresDurationOrStartDate(
  jobType: JobType,
  contractType?: ContractType,
) {
  return (
    timeBoundJobTypes.includes(jobType) ||
    (jobType === "job" && contractType === "CDD")
  );
}

export function showsWeeklyHours(jobType: JobType) {
  return jobType === "miniJob" || jobType === "job";
}

/** Translation keys (under `jobs.`) describing an offer's contract, in order. */
export function contractLabelKeys(job: {
  type: JobType;
  contractType?: ContractType;
  workTime?: WorkTime;
}) {
  const keys: string[] = [];
  if (job.contractType) keys.push(`labels.contracts.${job.contractType}`);
  if (job.workTime) keys.push(`labels.workTimes.${job.workTime}`);
  if (keys.length === 0) keys.push(`labels.jobTypes.${job.type}`);
  return keys;
}

export const MAX_SALARY = 1_000_000;
export const MAX_WEEKLY_HOURS = 80;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string) {
  return DATE_ONLY.test(value) && !Number.isNaN(Date.parse(value));
}
