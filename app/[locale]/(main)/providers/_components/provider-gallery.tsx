"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

type GalleryImage = { storageId: string; url: string };

/** Thumbnail grid; a click opens a full-screen swipeable slider. */
export function ProviderGallery({
  name,
  images,
}: {
  name: string;
  images: GalleryImage[];
}) {
  const t = useTranslations("providers");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={image.storageId}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={t("details.galleryOpen", { index: index + 1 })}
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-lg bg-muted"
          >
            <Image
              src={image.url}
              alt={`${name} ${index + 1}`}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => !open && setOpenIndex(null)}
      >
        <DialogContent className="max-w-[calc(100%-1rem)] gap-0 bg-background p-0 sm:max-w-5xl [&>button]:z-10">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          {openIndex !== null && (
            <Carousel
              setApi={setApi}
              opts={{ startIndex: openIndex, loop: images.length > 1 }}
            >
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={image.storageId}>
                    <div className="relative h-[75vh] w-full">
                      <Image
                        src={image.url}
                        alt={`${name} ${index + 1}`}
                        fill
                        sizes="100vw"
                        className="object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-3 hidden sm:flex" />
                  <CarouselNext className="right-3 hidden sm:flex" />
                  <div className="absolute inset-x-0 bottom-3 text-center text-muted-foreground text-sm">
                    {current + 1} / {images.length}
                  </div>
                </>
              )}
            </Carousel>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
