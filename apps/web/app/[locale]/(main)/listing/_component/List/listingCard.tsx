"use client";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { ListingListItem } from "@/lib/convexTypes";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { MouseEvent } from "react";
import { PriceDisplay } from "../price";
import { BookmarkButton } from "./bookmarkButton";

/** Photo card with a floating title/price panel, shared by the listings grid and the home page preview. */
export function ListingCard({
  listing,
  selected = false,
  onClick,
  className,
}: {
  listing: ListingListItem;
  selected?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  const t = useTranslations("listing");

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className={cn(
        "group relative block h-fit cursor-pointer rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99] active:ring-1 active:ring-primary active:shadow-primary motion-reduce:transform-none",
        listing.status === "pending" && "rounded-xl ring-2 ring-amber-500/60",
        selected && "ring-2 ring-primary rounded-xl shadow-primary",
        className,
      )}
      onClick={onClick}
    >
      <div className="relative h-80 w-full rounded-xl overflow-hidden shadow-xl">
        <Image
          src={
            listing.images?.[0]?.url ||
            listing.images?.[0]?.secureUrl ||
            "/default-cover.jpg"
          }
          alt={listing.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <Badge className="absolute top-2 left-2 z-10">
          {t(
            `labels.listingTypes.${listing.propertyType}` as Parameters<
              typeof t
            >[0],
          )}
        </Badge>
        {listing.status === "pending" ? (
          <Badge className="absolute right-2 top-12 z-10 bg-amber-500 text-amber-950 hover:bg-amber-500">
            {t("list.pending")}
          </Badge>
        ) : null}

        <BookmarkButton
          listingId={listing._id}
          initialBookmark={listing.isBookmarked}
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="absolute inset-x-3 bottom-3 p-3 bg-background/95 backdrop-blur-sm rounded-lg border">
        <h3 className="font-semibold mb-1 line-clamp-1">{listing.title}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="size-3" />
          {listing.city}
        </div>
        <div className="font-bold">
          <PriceDisplay
            price={listing.price}
            listingMode={listing.listingMode}
            className="text-primary"
          />
        </div>
      </div>
    </Link>
  );
}
