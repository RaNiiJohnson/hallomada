"use client";

import { Button } from "@/components/ui/button";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

interface ListingImage {
  storageId?: string;
  url?: string;
  publicId?: string;
  secureUrl?: string;
}

interface ImageGridProps {
  images?: ListingImage[];
  title: string;
}

interface ResolvedImage {
  key: string;
  src: string;
}

type GalleryView = "overview" | "viewer";

const GALLERY_HISTORY_KEY = "hallomadaListingGallery";

const HERO_IMAGE_SIZES =
  "(max-width: 640px) calc(100vw - 3rem), (max-width: 1024px) 66vw, 640px";

function useCarouselIndex(api: CarouselApi | undefined, initialIndex = 0) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!api) return;

    const updateIndex = () => setIndex(api.selectedScrollSnap());
    updateIndex();
    api.on("select", updateIndex);
    api.on("reInit", updateIndex);

    return () => {
      api.off("select", updateIndex);
      api.off("reInit", updateIndex);
    };
  }, [api]);

  return [index, setIndex] as const;
}

export function ImageGrid({ images, title }: ImageGridProps) {
  const t = useTranslations("listing.details.gallery");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [galleryView, setGalleryView] = useState<GalleryView>("viewer");
  const [canReturnToOverview, setCanReturnToOverview] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [lightboxApi, setLightboxApi] = useState<CarouselApi>();
  const [mobileIndex] = useCarouselIndex(mobileApi);
  const [lightboxIndex, setLightboxIndex] = useCarouselIndex(
    lightboxApi,
    fullscreenIndex,
  );
  const galleryHistoryToken = useId();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const galleryHistoryTokenRef = useRef<string | null>(null);

  const allImages = useMemo<ResolvedImage[]>(
    () =>
      (images ?? []).flatMap((image, index) => {
        const src = image.url || image.secureUrl;
        if (!src) return [];

        return [
          {
            key: image.storageId || image.publicId || `${src}-${index}`,
            src,
          },
        ];
      }),
    [images],
  );

  const rememberReturnFocus = () => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };

  const pushGalleryHistory = () => {
    if (galleryHistoryTokenRef.current) return;

    const token = galleryHistoryToken;
    const currentState = window.history.state;
    const nextState =
      typeof currentState === "object" && currentState !== null
        ? { ...currentState, [GALLERY_HISTORY_KEY]: token }
        : { [GALLERY_HISTORY_KEY]: token };

    window.history.pushState(nextState, "", window.location.href);
    galleryHistoryTokenRef.current = token;
  };

  const resetFullscreenState = useCallback(() => {
    setIsFullscreen(false);
    setLightboxApi(undefined);
    setCanReturnToOverview(false);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const token = galleryHistoryTokenRef.current;
      if (
        !isFullscreen ||
        !token ||
        event.state?.[GALLERY_HISTORY_KEY] === token
      ) {
        return;
      }

      galleryHistoryTokenRef.current = null;
      resetFullscreenState();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isFullscreen, resetFullscreenState]);

  const openViewer = (index: number) => {
    rememberReturnFocus();
    pushGalleryHistory();
    setFullscreenIndex(index);
    setLightboxIndex(index);
    setGalleryView("viewer");
    setCanReturnToOverview(false);
    setIsFullscreen(true);
  };

  const openGallery = () => {
    rememberReturnFocus();
    pushGalleryHistory();
    setGalleryView("overview");
    setCanReturnToOverview(false);
    setIsFullscreen(true);
  };

  const openViewerFromGallery = (index: number) => {
    setFullscreenIndex(index);
    setLightboxIndex(index);
    setLightboxApi(undefined);
    setCanReturnToOverview(true);
    setGalleryView("viewer");
  };

  const returnToGallery = () => {
    setLightboxApi(undefined);
    setGalleryView("overview");
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsFullscreen(true);
      return;
    }

    const token = galleryHistoryTokenRef.current;
    galleryHistoryTokenRef.current = null;
    resetFullscreenState();

    if (token && window.history.state?.[GALLERY_HISTORY_KEY] === token) {
      window.history.back();
    }
  };

  const handleViewerBackdropClick = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    const image = event.currentTarget.querySelector("img");
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) {
      handleOpenChange(false);
      return;
    }

    const bounds = image.getBoundingClientRect();
    const scale = Math.min(
      bounds.width / image.naturalWidth,
      bounds.height / image.naturalHeight,
    );
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const renderedLeft = bounds.left + (bounds.width - renderedWidth) / 2;
    const renderedTop = bounds.top + (bounds.height - renderedHeight) / 2;
    const clickedImage =
      event.clientX >= renderedLeft &&
      event.clientX <= renderedLeft + renderedWidth &&
      event.clientY >= renderedTop &&
      event.clientY <= renderedTop + renderedHeight;

    if (!clickedImage) handleOpenChange(false);
  };

  const imageAlt = (index: number) =>
    t("imageAlt", { title, current: index + 1, total: allImages.length });

  if (allImages.length === 0) {
    return (
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted md:h-96 md:aspect-auto md:rounded-2xl">
        <Image
          src="/default-cover.jpg"
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 80vw"
          className="object-cover"
        />
      </div>
    );
  }

  const desktopImages = allImages.slice(0, 3);

  return (
    <>
      <div className="relative md:hidden">
        <Carousel
          setApi={setMobileApi}
          opts={{ align: "start", loop: false, skipSnaps: false }}
          className="w-full"
        >
          <CarouselContent className="ml-0">
            {allImages.map((image, index) => (
              <CarouselItem key={image.key} className="pl-0">
                <button
                  type="button"
                  className="relative block aspect-4/3 w-full cursor-zoom-in overflow-hidden bg-muted text-left"
                  onClick={() => openViewer(index)}
                  aria-label={t("openImage", {
                    current: index + 1,
                    total: allImages.length,
                  })}
                >
                  <Image
                    src={image.src}
                    alt={imageAlt(index)}
                    fill
                    className="object-cover"
                    sizes={HERO_IMAGE_SIZES}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-3 left-3 z-10 gap-2 border border-border/70 bg-background/85 shadow-sm backdrop-blur-md hover:bg-background"
          onClick={openGallery}
        >
          <Images className="size-4" />
          {t("viewAll")}
        </Button>

        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
          {t("counter", {
            current: mobileIndex + 1,
            total: allImages.length,
          })}
        </div>
      </div>

      <div className="relative hidden h-96 grid-cols-3 grid-rows-2 gap-2 overflow-hidden rounded-2xl bg-muted md:grid">
        {desktopImages.map((image, index) => {
          const isOnlyImage = allImages.length === 1;
          const isSecondOfTwo = allImages.length === 2 && index === 1;

          return (
            <button
              key={image.key}
              type="button"
              className={
                index === 0
                  ? `group relative row-span-2 cursor-zoom-in overflow-hidden ${isOnlyImage ? "col-span-3" : "col-span-2"}`
                  : `group relative cursor-zoom-in overflow-hidden ${isSecondOfTwo ? "row-span-2" : ""}`
              }
              onClick={() => openViewer(index)}
              aria-label={t("openImage", {
                current: index + 1,
                total: allImages.length,
              })}
            >
              <Image
                src={image.src}
                alt={imageAlt(index)}
                fill
                className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                sizes={
                  index === 0
                    ? HERO_IMAGE_SIZES
                    : "(max-width: 1024px) 33vw, 320px"
                }
                loading={index === 0 ? "eager" : "lazy"}
              />
              <span className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
            </button>
          );
        })}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 z-10 gap-2 border border-white/25 bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
          onClick={openGallery}
        >
          <Images className="size-4" />
          {t("viewAll")}
        </Button>
      </div>

      <Dialog open={isFullscreen} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 left-0 top-0 z-60 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 items-stretch gap-0 rounded-none border-0 bg-background p-0 shadow-none duration-200 sm:max-w-none"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          onKeyDown={(event) => {
            if (galleryView !== "viewer" || event.defaultPrevented) return;

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              lightboxApi?.scrollPrev();
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              lightboxApi?.scrollNext();
            }
          }}
        >
          <DialogTitle className="sr-only">{t("title", { title })}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("description")}
          </DialogDescription>

          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-20 size-10 rounded-full border border-border/70 bg-background/85 text-foreground shadow-sm backdrop-blur-md hover:bg-accent hover:text-accent-foreground sm:right-5 sm:top-5"
              aria-label={t("close")}
            >
              <X className="size-5" />
            </Button>
          </DialogClose>

          {galleryView === "overview" ? (
            <div className="h-dvh w-full overflow-y-auto overscroll-contain bg-background">
              <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center px-4 pr-16 sm:px-6 sm:pr-20">
                  <div>
                    <h2 className="font-semibold text-foreground sm:text-lg">
                      {t("allPhotosTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {t("photoCount", { count: allImages.length })}
                    </p>
                  </div>
                </div>
              </header>

              <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6 lg:py-8">
                {allImages.map((image, index) => (
                  <button
                    key={image.key}
                    type="button"
                    className={`group relative aspect-4/3 cursor-zoom-in overflow-hidden rounded-xl bg-muted text-left ${index === 0 ? "sm:col-span-2 sm:aspect-2/1" : ""}`}
                    onClick={() => openViewerFromGallery(index)}
                    aria-label={t("openImage", {
                      current: index + 1,
                      total: allImages.length,
                    })}
                  >
                    <Image
                      src={image.src}
                      alt={imageAlt(index)}
                      fill
                      className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.015]"
                      sizes={
                        index === 0
                          ? "(max-width: 640px) calc(100vw - 2rem), min(100vw - 3rem, 1152px)"
                          : "(max-width: 640px) calc(100vw - 2rem), min(50vw - 2rem, 568px)"
                      }
                    />
                    <span className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {canReturnToOverview && (
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute left-3 top-3 z-20 gap-2 rounded-full border border-border/70 bg-background/85 px-3 text-foreground shadow-sm backdrop-blur-md hover:bg-accent hover:text-accent-foreground sm:left-5 sm:top-5"
                  onClick={returnToGallery}
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">{t("backToGallery")}</span>
                  <span className="sr-only sm:hidden">
                    {t("backToGallery")}
                  </span>
                </Button>
              )}

              <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-border/70 bg-background/85 px-3 py-2 text-xs font-medium tabular-nums text-foreground shadow-sm backdrop-blur-md sm:top-5 sm:text-sm">
                {t("counter", {
                  current: lightboxIndex + 1,
                  total: allImages.length,
                })}
              </div>

              <Carousel
                className="h-full w-full"
                setApi={setLightboxApi}
                opts={{
                  align: "center",
                  containScroll: "trimSnaps",
                  duration: 28,
                  loop: false,
                  skipSnaps: false,
                  startIndex: fullscreenIndex,
                }}
              >
                <CarouselContent className="ml-0 h-full">
                  {allImages.map((image, index) => (
                    <CarouselItem
                      key={image.key}
                      className="h-full pl-0"
                      aria-label={t("slide", {
                        current: index + 1,
                        total: allImages.length,
                      })}
                    >
                      <div
                        className="flex h-dvh w-full items-center justify-center px-3 py-16 sm:px-16 sm:py-12"
                        onClick={handleViewerBackdropClick}
                      >
                        <div className="relative h-full w-full max-w-7xl">
                          <Image
                            src={image.src}
                            alt={imageAlt(index)}
                            fill
                            className="select-none object-contain"
                            sizes="(max-width: 640px) calc(100vw - 1.5rem), calc(100vw - 8rem)"
                            draggable={false}
                          />
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {allImages.length > 1 && lightboxIndex > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 z-20 size-10 -translate-y-1/2 rounded-full border border-border/70 bg-background/85 text-foreground shadow-sm backdrop-blur-md hover:bg-accent hover:text-accent-foreground sm:left-5 sm:size-12"
                    onClick={() => lightboxApi?.scrollPrev()}
                    aria-label={t("previous")}
                  >
                    <ChevronLeft className="size-6" />
                  </Button>
                )}

                {allImages.length > 1 &&
                  lightboxIndex < allImages.length - 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 z-20 size-10 -translate-y-1/2 rounded-full border border-border/70 bg-background/85 text-foreground shadow-sm backdrop-blur-md hover:bg-accent hover:text-accent-foreground sm:right-5 sm:size-12"
                      onClick={() => lightboxApi?.scrollNext()}
                      aria-label={t("next")}
                    >
                      <ChevronRight className="size-6" />
                    </Button>
                  )}
              </Carousel>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
