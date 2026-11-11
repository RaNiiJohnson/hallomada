import * as z from "zod";

import {
  MAX_SALARY,
  MAX_WEEKLY_HOURS,
  jobTypeHasContract,
  jobTypeValues,
  requiresDurationOrStartDate,
  selectableContractTypes,
  workModeValues,
  workTimeValues,
} from "@hallomada/shared/job-offer-options";

export const salaryPeriodValues = ["hour", "month", "year"] as const;

type Translate = (key: string) => string;

export function createJobFormSchema(t: Translate) {
  return z
    .object({
      title: z.string().min(1, t("form.validation.titleReq")),
      type: z.enum(jobTypeValues),
      location: z.object({ lat: z.number(), lng: z.number() }).optional(),
      showMap: z.boolean(),
      contractType: z.enum(selectableContractTypes).optional(),
      workTime: z.enum(workTimeValues).optional(),
      city: z.string(),
      workMode: z.enum(workModeValues),
      remoteLocation: z.string().optional(),
      duration: z.string().optional(),
      startDate: z.string().optional(),
      applicationDeadline: z.string().optional(),
      company: z.string().min(1, t("form.validation.companyReq")),
      description: z.string().min(10, t("form.validation.descMin")),
      certificates: z
        .array(z.object({ certificate: z.string() }))
        .max(5, t("form.validation.certMax")),
      salary: z.string().optional(),
      salaryPeriod: z.enum(salaryPeriodValues).optional(),
      sector: z.string().optional(),
      benefits: z.string().optional(),
      externalApplicationUrl: z.string().url().optional().or(z.literal("")),
      weeklyHours: z.string().optional(),
      trainingRequirements: z.string().optional(),
      contactEmail: z.string().email(t("form.validation.contactEmailReq")),
    })
    .superRefine((data, ctx) => {
      if (data.workMode !== "remote" && !data.city.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: t("form.validation.cityReq"),
        });
      }
      if (jobTypeHasContract(data.type)) {
        if (!data.contractType) {
          ctx.addIssue({
            code: "custom",
            path: ["contractType"],
            message: t("form.validation.contractReq"),
          });
        }
        if (!data.workTime) {
          ctx.addIssue({
            code: "custom",
            path: ["workTime"],
            message: t("form.validation.workTimeReq"),
          });
        }
      }
      if (data.salary?.trim()) {
        const salary = Number(data.salary);
        if (!Number.isFinite(salary) || salary < 0 || salary > MAX_SALARY) {
          ctx.addIssue({
            code: "custom",
            path: ["salary"],
            message: t("form.validation.salaryInvalid"),
          });
        }
      }
      if (data.weeklyHours?.trim()) {
        const hours = Number(data.weeklyHours);
        if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_WEEKLY_HOURS) {
          ctx.addIssue({
            code: "custom",
            path: ["weeklyHours"],
            message: t("form.validation.weeklyHoursInvalid"),
          });
        }
      }
      if (
        data.startDate &&
        data.applicationDeadline &&
        data.applicationDeadline > data.startDate
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["applicationDeadline"],
          message: t("form.validation.deadlineAfterStart"),
        });
      }
      if (requiresDurationOrStartDate(data.type, data.contractType)) {
        if (!data.duration?.trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["duration"],
            message: t("form.validation.durationReq"),
          });
        }
        if (!data.startDate?.trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["startDate"],
            message: t("form.validation.startDateReq"),
          });
        }
      }
    });
}

export type JobFormValues = z.infer<ReturnType<typeof createJobFormSchema>>;

/** Optional inputs that live in the collapsed "more details" section. */
export const optionalJobFields = [
  "salary",
  "salaryPeriod",
  "sector",
  "trainingRequirements",
  "weeklyHours",
  "applicationDeadline",
  "benefits",
  "externalApplicationUrl",
  "certificates",
] as const satisfies ReadonlyArray<keyof JobFormValues>;

export const emptyJobFormValues: JobFormValues = {
  title: "",
  type: "auPair",
  location: undefined,
  showMap: false,
  contractType: undefined,
  workTime: undefined,
  city: "",
  workMode: "onSite",
  remoteLocation: "",
  duration: "",
  startDate: "",
  applicationDeadline: "",
  company: "",
  description: "",
  certificates: [],
  salary: "",
  salaryPeriod: "month",
  sector: "",
  benefits: "",
  externalApplicationUrl: "",
  weeklyHours: "",
  trainingRequirements: "",
  contactEmail: "",
};

/** Maps form values to the payload shared by createJob and updateJob. */
export function toJobMutationInput(data: JobFormValues) {
  const hasPublicLocation = data.workMode !== "remote" && data.showMap;
  return {
    title: data.title,
    type: data.type,
    contractType: jobTypeHasContract(data.type) ? data.contractType : undefined,
    workTime: jobTypeHasContract(data.type) ? data.workTime : undefined,
    city: data.city,
    workMode: data.workMode,
    remoteLocation: data.remoteLocation || undefined,
    duration: data.duration || undefined,
    startDate: data.startDate || undefined,
    applicationDeadline: data.applicationDeadline || undefined,
    company: data.company,
    description: data.description,
    certificates: data.certificates
      .map((item) => item.certificate)
      .filter((item) => item.trim() !== ""),
    salary: data.salary ? Number(data.salary) : undefined,
    salaryPeriod: data.salaryPeriod,
    sector: data.sector || undefined,
    benefits: data.benefits || undefined,
    externalApplicationUrl: data.externalApplicationUrl || undefined,
    weeklyHours: data.weeklyHours ? Number(data.weeklyHours) : undefined,
    trainingRequirements: data.trainingRequirements || undefined,
    contactEmail: data.contactEmail,
    location: hasPublicLocation ? data.location : undefined,
  };
}
