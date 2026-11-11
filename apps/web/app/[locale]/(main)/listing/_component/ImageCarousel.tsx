"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface ListingImage {
  storageId?: string;
  publicId?: string;
  url?: string;
  secureUrl?: string;
}

interface ImageCarouselProps {
  images?: ListingImage[];
  title: string;
  compact?: boolean;
  showTitleOverlay?: boolean;
}

function TitleOverlay({ title }: { title: string }) {
  return (
    <div className="absolute inset-x-3 bottom-3">
      <h2 className="inline-flex max-w-full rounded-md bg-black/55 px-2.5 py-1.5 text-base font-semibold text-white backdrop-blur-sm">
        <span className="truncate">{title}</span>
      </h2>
    </div>
  );
}

export function ImageCarousel({
  images,
  title,
  compact = false,
  showTitleOverlay = false,
}: ImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const allImages = images && images.length > 0 ? images : null;

  // Écouter les changements du carousel pour mettre à jour l'index actuel
  useEffect(() => {
    if (!api) {
      return;
    }

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    // Initialiser l'index actuel
    onSelect();

    // S'abonner aux changements
    api.on("select", onSelect);

    // Nettoyer l'abonnement
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (!allImages) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl bg-muted",
          compact ? "h-64 mb-3 rounded-none" : "h-80 mb-6",
        )}
      >
        <Image
          src="/default-cover.jpg"
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
        {showTitleOverlay && <TitleOverlay title={title} />}
      </div>
    );
  }

  return (
    <>
      {/* Carrousel principal avec shadcn/ui */}
      <div className={cn("relative group", compact ? "mb-3" : "mb-6")}>
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent className={cn(compact && "ml-0")}>
            {allImages.map((image, index) => (
              <CarouselItem
                key={image.storageId || image.publicId || index}
                className={cn(compact && "pl-0")}
              >
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-xl bg-muted",
                    compact ? "h-64 rounded-none" : "h-80",
                  )}
                >
                  <Image
                    src={image.url || image.secureUrl || ""}
                    alt={`${title} - Image ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent" />

                  {/* Compteur d'images */}
                  <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                    {index + 1} / {allImages.length}
                  </div>

                  {showTitleOverlay && <TitleOverlay title={title} />}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation personnalisée */}
          <CarouselPrevious className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0" />
          <CarouselNext className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0" />
        </Carousel>

        {/* Miniatures */}
        {allImages.length > 1 && (
          <div
            className={cn(
              "flex gap-2 overflow-x-auto",
              compact ? "mt-2 px-4 pb-1" : "mt-3 pb-2",
            )}
          >
            {allImages.map((image, index) => (
              <button
                key={image.storageId || image.publicId || index}
                className={cn(
                  "relative shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer",
                  compact ? "size-14" : "size-16",
                  index === current
                    ? "border-primary scale-105"
                    : "border-transparent hover:border-muted-foreground/50",
                )}
                onClick={() => api?.scrollTo(index)}
              >
                <Image
                  src={image.url || image.secureUrl || ""}
                  alt={`Miniature ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
                {index === current && (
                  <div className="absolute inset-0 bg-primary/20" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
