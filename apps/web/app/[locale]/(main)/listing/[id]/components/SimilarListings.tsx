"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ListingListDetails } from "@/lib/convexTypes";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { PriceDisplay } from "../../_component/price";

export function SimilarListings({
  slug,
  property,
}: {
  slug: string;
  property: ListingListDetails;
}) {
  const t = useTranslations("listing");
  const properties = useQuery(
    api.listings.queries.getSimilarRealEstateListings,
    {
      excludeSlug: slug,
      city: property.city,
      propertyType: property.propertyType,
      limit: 6,
    },
  );

  if (
    properties === null ||
    properties === undefined ||
    properties.length === 0
  ) {
    return null;
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <h2 className="text-2xl font-bold">{t("similar.title")}</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((list) => (
          <Link
            key={list.slug}
            href={`/listing/${list.slug}`}
            className="group relative block h-fit cursor-pointer rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary active:scale-[0.99] active:ring-2 active:ring-primary active:shadow-primary motion-reduce:transform-none"
          >
            <div className="relative h-80 w-full rounded-xl overflow-hidden shadow-xl">
              <Image
                src={
                  list.images?.[0]?.url ||
                  list.images?.[0]?.secureUrl ||
                  "/default-cover.jpg"
                }
                alt={list.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <Badge className="absolute top-2 left-2 z-10">
                {t(
                  `labels.listingTypes.${list.propertyType}` as Parameters<
                    typeof t
                  >[0],
                )}
              </Badge>

              {/* Indicateur de photos multiples */}
              {list.images && list.images.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md z-10">
                  {t("similar.photos", { count: list.images.length })}
                </div>
              )}

              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute inset-x-3 bottom-3 p-3 bg-background/95 backdrop-blur-sm rounded-lg border">
              <h3 className="font-semibold mb-1 line-clamp-1">{list.title}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <MapPin className="size-3" />
                {list.city}
              </div>
              <PriceDisplay
                price={list.price}
                listingMode={list.listingMode}
                className="text-primary"
              />
            </div>
          </Link>
        ))}
      </div>

      <div className="py-4 text-center sm:py-6">
        {properties.length < 3 && (
          <p className="text-muted-foreground mb-4">{t("similar.emptyMsg")}</p>
        )}
        <Link href="/listing">
          <Button variant="outline">{t("similar.emptyBtn")}</Button>
        </Link>
      </div>
    </section>
  );
}
