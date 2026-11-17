import type { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type ProviderPage = NonNullable<
  FunctionReturnType<typeof api.providers.queries.getProviderBySlug>
>;

export type ProviderCard = FunctionReturnType<
  typeof api.providers.queries.listProviders
>["page"][number];
