"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { notFound, useParams } from "next/navigation";
import { ProviderShowcase } from "../_components/provider-showcase";

export default function ProviderPage() {
  const { slug } = useParams<{ slug: string }>();
  const provider = useQuery(api.providers.queries.getProviderBySlug, { slug });

  if (provider === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 pt-14">
        <Skeleton className="h-72 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (provider === null) {
    notFound();
  }

  return <ProviderShowcase provider={provider} />;
}
