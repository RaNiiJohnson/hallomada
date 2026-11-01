"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { providerCategoryValues, type ProviderCategory } from "@/lib/providers";
import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex-helpers/react/cache";
import { MapPin, Plus, Search, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import type { ProviderCard } from "./types";

const filterParsers = {
  search: parseAsString.withDefault(""),
  category: parseAsStringLiteral(providerCategoryValues),
};

export function ProviderDirectory() {
  const t = useTranslations("providers");
  const [filters, setFilters] = useQueryStates(filterParsers);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [debouncedSearch] = useDebounce(localSearch, 500);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch || null });
    }
  }, [debouncedSearch, filters.search, setFilters]);

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <InputGroup>
          <InputGroupInput
            placeholder={t("list.searchPlaceholder")}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex flex-wrap gap-2">
          <CategoryBadge
            active={filters.category === null}
            onClick={() => setFilters({ category: null })}
          >
            {t("list.allCategories")}
          </CategoryBadge>
          {providerCategoryValues.map((category) => (
            <CategoryBadge
              key={category}
              active={filters.category === category}
              onClick={() => setFilters({ category })}
            >
              {t(`categories.${category}`)}
            </CategoryBadge>
          ))}
        </div>
        <CreateProviderButton />
      </div>

      <ProviderGrid
        searchTerm={filters.search}
        category={filters.category ?? undefined}
      />
    </div>
  );
}

function CategoryBadge({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Badge
      asChild
      variant={active ? "default" : "outline"}
      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
    >
      <button type="button" onClick={onClick} aria-pressed={active}>
        {children}
      </button>
    </Badge>
  );
}

function CreateProviderButton() {
  const t = useTranslations("providers");
  return (
    <div className="flex justify-end">
      <Button size="sm" asChild>
        <Link href="/providers/new">
          <Plus className="size-4" />
          {t("list.create")}
        </Link>
      </Button>
    </div>
  );
}

function ProviderGrid({
  searchTerm,
  category,
}: {
  searchTerm: string;
  category?: ProviderCategory;
}) {
  const t = useTranslations("providers");
  const { results, status, loadMore } = usePaginatedQuery(
    api.providers.queries.listProviders,
    { searchTerm: searchTerm || undefined, category },
    { initialNumItems: 12 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <Store className="size-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-xl">{t("list.emptyTitle")}</h3>
        <p className="text-muted-foreground">{t("list.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((provider) => (
          <ProviderCardItem key={provider._id} provider={provider} />
        ))}
      </div>
      {status !== "Exhausted" && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(12)}
          >
            {status === "LoadingMore" ? t("list.loading") : t("list.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

function ProviderCardItem({ provider }: { provider: ProviderCard }) {
  const t = useTranslations("providers");

  return (
    <Link
      href={`/providers/${provider.slug}`}
      className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-muted">
        {provider.status === "pending" && (
          <Badge variant="secondary" className="absolute top-2 left-2 z-10 shadow-sm">
            {t("status.pending")}
          </Badge>
        )}
        {provider.coverUrl ? (
          <Image
            src={provider.coverUrl}
            alt={provider.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Store className="size-10 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <div className="flex gap-3 p-4">
        <ProviderAvatar name={provider.name} logoUrl={provider.logoUrl} />
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-semibold">{provider.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
            <Badge variant="secondary">
              {t(`categories.${provider.category}`)}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {provider.city}
            </span>
          </div>
          {provider.tagline && (
            <p className="line-clamp-2 text-muted-foreground text-sm">
              {provider.tagline}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProviderAvatar({
  name,
  logoUrl,
  className = "size-12 text-base",
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border bg-primary/10 ${className}`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={name} fill sizes="96px" className="object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center font-semibold text-primary">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
