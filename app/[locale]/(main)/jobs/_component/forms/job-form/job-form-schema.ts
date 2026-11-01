import * as z from "zod";

import {
  contractTypeValues,
  jobTypeValues,
  requiresDurationOrStartDate,
  workModeValues,
} from "@/lib/job-offer-options";

export const salaryPeriodValues = ["hour", "month", "year"] as const;

type Translate = (key: string) => string;

export function createJobFormSchema(t: Translate) {
  return z
    .object({
      title: z.string().min(1, t("form.validation.titleReq")),
      type: z.enum(jobTypeValues),
      location: z.object({ lat: z.number(), lng: z.number() }).optional(),
      showMap: z.boolean(),
      contractType: z.enum(contractTypeValues),
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
  contractType: "CDD",
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
    contractType: data.contractType,
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
