import * as z from "zod";

import type { ListingListDetails } from "@/lib/convexTypes";

export const listingTypeValues = [
  "room",
  "apartment",
  "house",
  "studio",
  "shared",
] as const;

export const listingModeValues = ["rent", "sale"] as const;

type Translate = (key: string) => string;

export function createListingFormSchema(t: Translate) {
  return z
    .object({
      title: z.string().min(1, t("form.validation.titleReq")),
      propertyType: z.enum(listingTypeValues),
      listingMode: z.enum(listingModeValues),
      location: z.object({ lat: z.number(), lng: z.number() }).optional(),
      showMap: z.boolean(),
      city: z.string().min(1, t("form.validation.cityReq")),
      neighborhood: z.string().trim().max(80).optional(),
      price: z.string().min(1, t("form.validation.priceReq")),
      charges: z.string().optional(),
      deposit: z.string().optional(),
      area: z.string().min(1, t("form.validation.areaReq")),
      bathrooms: z.string().min(1, t("form.validation.bathroomsReq")),
      bedrooms: z.string().min(1, t("form.validation.bedroomsReq")),
      floor: z.string().min(1, t("form.validation.floorReq")),
      pets: z.boolean(),
      description: z.string().min(10, t("form.validation.descMin")),
      extras: z.array(z.string()).optional(),
      availableFrom: z.string().min(1, t("form.validation.availableFromReq")),
      contactEmail: z
        .string()
        .trim()
        .email(t("form.validation.emailInvalid"))
        .or(z.literal("")),
      contactPhone: z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{6,30}$/, t("form.validation.phoneInvalid"))
        .or(z.literal("")),
    })
    .superRefine((values, ctx) => {
      if (!values.contactEmail && !values.contactPhone) {
        for (const path of ["contactEmail", "contactPhone"]) {
          ctx.addIssue({
            code: "custom",
            message: t("form.validation.contactReq"),
            path: [path],
          });
        }
      }
    });
}

export type ListingFormValues = z.infer<
  ReturnType<typeof createListingFormSchema>
>;

/** Optional inputs that live in the collapsed "more details" section. */
export const optionalListingFields = [
  "neighborhood",
  "charges",
  "deposit",
  "pets",
  "extras",
] as const satisfies ReadonlyArray<keyof ListingFormValues>;

export function formatLocalCalendarDate(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function listingFormDefaults(
  listing?: ListingListDetails,
): ListingFormValues {
  return {
    title: listing?.title ?? "",
    propertyType: listing?.propertyType ?? "apartment",
    listingMode: listing?.listingMode ?? "rent",
    location: undefined,
    showMap: false,
    city: listing?.city ?? "",
    neighborhood: listing?.neighborhood ?? "",
    price: listing ? String(listing.price) : "",
    charges: listing?.charges !== undefined ? String(listing.charges) : "",
    deposit: listing?.deposit !== undefined ? String(listing.deposit) : "",
    area: listing ? String(listing.area) : "",
    bathrooms: listing ? String(listing.bathrooms) : "",
    bedrooms: listing ? String(listing.bedrooms) : "",
    floor: listing ? String(listing.floor) : "",
    pets: listing?.pets ?? false,
    description: listing?.description ?? "",
    extras: listing?.extras ?? [],
    availableFrom: listing?.availableFrom
      ? formatLocalCalendarDate(listing.availableFrom)
      : "",
    contactEmail: listing?.contact?.email ?? "",
    contactPhone: listing?.contact?.phone ?? "",
  };
}
