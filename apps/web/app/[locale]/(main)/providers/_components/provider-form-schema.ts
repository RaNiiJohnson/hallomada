import { z } from "zod";

import {
  MAX_PROVIDER_SERVICE_NAME,
  MAX_PROVIDER_SERVICE_PRICE,
  MAX_PROVIDER_TAGLINE,
  normalizePhoneNumber,
  normalizeSocialLink,
  normalizeWebsite,
  providerCategoryValues,
  providerServiceModeValues,
  type ProviderSocialNetwork,
} from "@hallomada/shared/providers";
import type { ProviderPage } from "./types";

type Translate = (key: string) => string;

const optionalWith = (check: (value: string) => boolean, message: string) =>
  z.string().refine((value) => !value.trim() || check(value), message);

const socialField = (network: ProviderSocialNetwork, message: string) =>
  optionalWith((value) => normalizeSocialLink(network, value) !== null, message);

export function createProviderFormSchema(t: Translate) {
  return z.object({
    name: z.string().trim().min(1, t("form.validation.nameReq")).max(100),
    category: z.enum(providerCategoryValues),
    tagline: z
      .string()
      .max(MAX_PROVIDER_TAGLINE, t("form.validation.tooLong")),
    city: z.string().trim().min(1, t("form.validation.cityReq")).max(100),
    serviceModes: z
      .array(z.enum(providerServiceModeValues))
      .min(1, t("form.validation.serviceModesReq")),
    description: z.string().trim().min(20, t("form.validation.descMin")),
    services: z.array(
      z.object({
        name: z
          .string()
          .max(MAX_PROVIDER_SERVICE_NAME, t("form.validation.tooLong")),
        price: z
          .string()
          .max(MAX_PROVIDER_SERVICE_PRICE, t("form.validation.tooLong")),
      }),
    ),
    whatsapp: z
      .string()
      .refine(
        (value) => normalizePhoneNumber(value) !== null,
        t("form.validation.whatsappInvalid"),
      ),
    phone: optionalWith(
      (value) => normalizePhoneNumber(value) !== null,
      t("form.validation.phoneInvalid"),
    ),
    email: optionalWith(
      (value) => z.email().safeParse(value.trim()).success,
      t("form.validation.emailInvalid"),
    ),
    website: optionalWith(
      (value) => normalizeWebsite(value) !== null,
      t("form.validation.urlInvalid"),
    ),
    facebook: socialField("facebook", t("form.validation.urlInvalid")),
    instagram: socialField("instagram", t("form.validation.urlInvalid")),
    tiktok: socialField("tiktok", t("form.validation.urlInvalid")),
  });
}

export type ProviderFormValues = z.infer<
  ReturnType<typeof createProviderFormSchema>
>;

export const optionalProviderContactFields = [
  "phone",
  "email",
  "website",
  "facebook",
  "instagram",
  "tiktok",
] as const;

export function providerFormDefaults(
  provider?: ProviderPage,
): ProviderFormValues {
  return {
    name: provider?.name ?? "",
    category: provider?.category ?? "food",
    tagline: provider?.tagline ?? "",
    city: provider?.city ?? "",
    serviceModes: provider?.serviceModes ?? [],
    description: provider?.description ?? "",
    services: provider?.services.map((service) => ({
      name: service.name,
      price: service.price ?? "",
    })) ?? [{ name: "", price: "" }],
    whatsapp: provider?.whatsapp ?? "",
    phone: provider?.phone ?? "",
    email: provider?.email ?? "",
    website: provider?.website ?? "",
    facebook: provider?.facebook ?? "",
    instagram: provider?.instagram ?? "",
    tiktok: provider?.tiktok ?? "",
  };
}
