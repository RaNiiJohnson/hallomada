"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { ListingListItem } from "@/lib/convexTypes";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import clsx from "clsx";
import { usePaginatedQuery } from "convex-helpers/react/cache";
import { Briefcase, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListingDetails, ListingDetailsContent } from "../ListingDetails";
import { PriceDisplay } from "../price";
import { ListingItemsSkeleton, ListingListSkeleton } from "../skeleton";
import { BookmarkButton } from "./bookmarkButton";

export function ListingList() {
  const t = useTranslations("listing");
  const [filters] = useQueryStates({
    search: parseAsString.withDefault(""),
    type: parseAsString.withDefault(""),
    bedrooms: parseAsInteger.withDefault(0),
    minPrice: parseAsInteger.withDefault(0),
    maxPrice: parseAsInteger.withDefault(0),
    mode: parseAsString.withDefault(""),
    bookmarkedOnly: parseAsString.withDefault("false"),
  });

  const {
    results: listings,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.listings.queries.getListing,
    {
      searchTerm: filters.search,
      propertyType: filters.type
        ? (filters.type as "room" | "apartment" | "house" | "studio" | "shared")
        : undefined,
      listingMode:
        filters.mode === "rent" || filters.mode === "sale"
          ? filters.mode
          : undefined,
      bedrooms: filters.bedrooms,
      minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
      maxPrice: filters.maxPrice > 0 ? filters.maxPrice : undefined,
      bookmarkedOnly: filters.bookmarkedOnly === "true" ? true : undefined,
    },
    { initialNumItems: 3 },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogListing, setDialogListing] = useState<ListingListItem | null>(
    null,
  );
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // Hook pour détecter la taille d'écran
  useEffect(() => {
    const checkScreenSize = () => {
      const isLarge = window.innerWidth >= 1024; // lg breakpoint
      setIsLargeScreen(isLarge);

      // Si on passe d'un grand écran à un petit écran et qu'il y a une sélection
      // on ferme la sélection et on ferme le dialog
      if (!isLarge && selectedId) {
        setSelectedId(null);
        setIsDialogOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [selectedId]);

  if (status === "LoadingFirstPage") {
    return <ListingListSkeleton />;
  }

  const selectedListing = listings.find((a) => a._id === selectedId);

  const handleListingClick = (listingId: string) => {
    const listing = listings.find((a) => a._id === listingId);

    if (isLargeScreen) {
      // Comportement pour grands écrans (panel)
      if (selectedId === listingId) {
        // Si déjà sélectionné, on ferme
        setSelectedId(null);
      } else {
        // Nouvelle sélection
        setSelectedId(listingId);
      }
    } else {
      // Comportement pour petits écrans (dialog)
      if (listing) {
        setDialogListing(listing);
        setIsDialogOpen(true);
      }
    }
  };

  if (listings.length === 0) {
    return (
      <div className="text-center px-4">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t("list.emptyTitle")}</h3>
          <p className="text-muted-foreground mb-6">{t("list.emptyDesc")}</p>
        </div>
      </div>
    );
  }

  function loadMoreListings() {
    if (status === "CanLoadMore") {
      loadMore(3);
    } else {
      toast.info(t("list.allLoadedToast"));
    }
  }

  return (
    <div
      className={cn(
        "transition-all duration-300 ",
        selectedId && "max-w-7xl mx-auto",
      )}
    >
      <div
        className={cn(
          "grid gap-6 transition-all duration-300 mt-8",
          selectedId
            ? "lg:grid-cols-[repeat(2,minmax(0,1fr))_450px]"
            : "md:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {listings.map((list) => (
          <Link
            key={list.slug}
            href={`/listing/${list.slug}`}
            className={cn(
              "group relative block h-fit cursor-pointer rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99] active:ring-1 active:ring-primary active:shadow-primary motion-reduce:transform-none",
              list.status === "pending" &&
                "rounded-xl ring-2 ring-amber-500/60",
              selectedId === list._id &&
                "ring-2 ring-primary rounded-xl shadow-primary",
            )}
            onClick={(e) => {
              // Sur les grands écrans, empêcher la navigation et utiliser le panel
              if (isLargeScreen) {
                e.preventDefault();
                handleListingClick(list._id);
              }
              // Sur les petits écrans, laisser la navigation normale se faire
            }}
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
              {list.status === "pending" ? (
                <Badge className="absolute right-2 top-12 z-10 bg-amber-500 text-amber-950 hover:bg-amber-500">
                  {t("list.pending")}
                </Badge>
              ) : null}

              <BookmarkButton
                listingId={list._id}
                initialBookmark={list.isBookmarked}
              />

              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute inset-x-3 bottom-3 p-3 bg-background/95 backdrop-blur-sm rounded-lg border">
              <h3 className="font-semibold mb-1 line-clamp-1">{list.title}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <MapPin className="size-3" />
                {list.city}
              </div>
              <div className="font-bold">
                <PriceDisplay
                  price={list.price}
                  listingMode={list.listingMode}
                  className="text-primary"
                />
              </div>
            </div>
          </Link>
        ))}

        {status === "LoadingMore" && <ListingItemsSkeleton count={3} />}
        {/* Panel de détails pour écrans lg */}
        {selectedListing && isLargeScreen && (
          <div
            className={cn(
              "lg:col-start-3 lg:row-start-1 sticky lg:row-span-10 top-48 h-fit max-h-[calc(100vh-3rem)] overflow-y-auto",
            )}
          >
            <ListingDetails
              listing={selectedListing}
              onClose={() => setSelectedId(null)}
              showCloseButton={true}
            />
          </div>
        )}
      </div>

      {/* Dialog pour écrans md et sm */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setDialogListing(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogListing?.title}</DialogTitle>
            <DialogDescription>{t("list.dialogDesc")}</DialogDescription>
          </DialogHeader>
          {dialogListing && <ListingDetailsContent listing={dialogListing} />}
        </DialogContent>
      </Dialog>
      <Button
        variant="outline"
        onClick={loadMoreListings}
        className={clsx("mx-auto flex items-center mt-5", {
          "cursor-not-allowed opacity-50": status !== "CanLoadMore",
        })}
      >
        {status === "LoadingMore" ? t("list.loading") : t("list.loadMoreBtn")}
      </Button>
    </div>
  );
}
