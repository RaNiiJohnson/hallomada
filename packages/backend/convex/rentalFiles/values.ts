import { v, type Infer } from "convex/values";

/** Documents German landlords usually ask for. */
export const rentalDocumentCategoryValidator = v.union(
  v.literal("id"),
  v.literal("payslip"),
  v.literal("schufa"),
  v.literal("rentDebtFree"),
  v.literal("employment"),
  v.literal("other"),
);
export type RentalDocumentCategory = Infer<typeof rentalDocumentCategoryValidator>;

export const RENTAL_DOCUMENT_CATEGORIES = [
  "id",
  "payslip",
  "schufa",
  "rentDebtFree",
  "employment",
  "other",
] as const satisfies readonly RentalDocumentCategory[];

export const rentalProfileValidator = v.object({
  occupation: v.optional(v.string()),
  employer: v.optional(v.string()),
  netMonthlyIncome: v.optional(v.number()),
  householdSize: v.optional(v.number()),
  moveInDate: v.optional(v.string()),
  pets: v.optional(v.boolean()),
  smoker: v.optional(v.boolean()),
  about: v.optional(v.string()),
});
export type RentalProfile = Infer<typeof rentalProfileValidator>;

export const MAX_RENTAL_DOCUMENTS = 12;
export const MAX_RENTAL_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const MAX_RENTAL_TEXT = 100;
export const MAX_RENTAL_ABOUT = 1000;
export const MAX_RENTAL_MESSAGE = 1000;
export const MAX_RENTAL_FILE_NAME = 120;
export const MAX_RENTAL_INCOME = 1_000_000;
export const MAX_HOUSEHOLD_SIZE = 20;

/** How long a landlord can open a dossier from the link they received. */
export const RENTAL_ACCESS_MS = 30 * 24 * 60 * 60 * 1000;

export const rentalDocumentContentTypeValidator = v.union(
  v.literal("application/pdf"),
  v.literal("image/jpeg"),
  v.literal("image/png"),
  v.literal("image/webp"),
);
