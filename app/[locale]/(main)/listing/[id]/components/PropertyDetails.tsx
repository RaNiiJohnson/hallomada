"use client";

import { FeaturedBadge } from "@/components/featured/featured-badge";
import { FounderBadge } from "@/components/founder-badge";
import { SendRentalFileButton } from "@/components/rental-file/send-rental-file-button";
import { TranslateMenu } from "@/components/translate-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemSeparator } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import {
  getFreshTranslation,
  getSupportedTranslationLanguage,
  useManualTranslate,
} from "@/hooks/use-manual-translate";
import { Link, useRouter } from "@/i18n/navigation";
import { getAuthHref, getCurrentReturnTo } from "@/lib/auth-return-to";
import { ListingListDetails } from "@/lib/convexTypes";
import { formatDateWithFallback } from "@/lib/date";
import { getListingContactLinks } from "@/lib/listing-contact";
import { LocationMap } from "@/lib/LocationMap";
import { truncateText } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useAction, useConvex, useConvexAuth } from "convex/react";
import {
  Bath,
  Bed,
  Calendar,
  Clock3,
  Layers3,
  Mail,
  MapPin,
  MessageCircle,
  PawPrint,
  Square,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { toast } from "sonner";
import { PriceDisplay } from "../../_component/price";
import { ImageGrid } from "./ImageGrid";

interface PropertyDetailsProps {
  property: ListingListDetails;
  showContactBar?: boolean;
}

export function PropertyDetails({
  property,
  showContactBar = true,
}: PropertyDetailsProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const tListing = useTranslations("listing");
  const te = useTranslations("common");

  const translateListing = useAction(api.listings.translate.translateListing);
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const translationLanguage = getSupportedTranslationLanguage(locale);
  const cachedTranslation = useQuery(
    api.listings.translate.getTranslation,
    translationLanguage
      ? { listingId: property._id, language: translationLanguage }
      : "skip",
  );
  const cached = getFreshTranslation(cachedTranslation, property.updatedAt);
  const requireAuthentication = useAuthRequiredAction();
  const router = useRouter();
  const requireEmailVerification = () => {
    router.push(
      getAuthHref("/verify-email", getCurrentReturnTo(window.location)),
    );
  };

  const { data, activeLang, pendingLang, selectTranslation, reset } =
    useManualTranslate(
      (lang) => {
        if (!property) throw new Error("property not loaded");
        return translateListing({
          listingId: property._id,
          targetLanguage: lang,
        });
      },
      {
        onError: () => toast.error(te("translateError")),
        initialTranslation:
          cached && translationLanguage
            ? { lang: translationLanguage, data: cached }
            : null,
        loadCached: async (lang) =>
          getFreshTranslation(
            await convex.query(api.listings.translate.getTranslation, {
              listingId: property._id,
              language: lang,
            }),
            property.updatedAt,
          ),
      },
    );

  const translation = data;
  const description = translation?.description ?? property.description;

  const title = translation?.title ?? property.title;
  const city = translation?.city ?? property.city;
  const handleTranslate = (
    language: Parameters<typeof selectTranslation>[0],
  ) =>
    void selectTranslation(language, {
      canCreate: isAuthenticated,
      onCreateRequired: requireAuthentication,
    });
  const locationLabel = [property.neighborhood, city]
    .filter(Boolean)
    .join(", ");
  const isActive =
    property.status === undefined || property.status === "active";
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const contactLinks = getListingContactLinks(property.contact);
  const [contactOpen, setContactOpen] = useState(false);

  const contactActions = (
    <div className="space-y-3">
      {property.listingMode === "rent" && (
        <SendRentalFileButton listingId={property._id} />
      )}
      {contactLinks.whatsappHref && (
        <Button asChild className="w-full" size="lg">
          <a
            href={contactLinks.whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            {tListing("details.whatsapp")}
          </a>
        </Button>
        )}
      {contactLinks.emailHref && (
        <Button asChild variant="outline" className="w-full" size="lg">
          <a href={contactLinks.emailHref} className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {tListing("details.sendEmail")}
          </a>
        </Button>
      )}

      {property.contactAccessRequired && (
        <Button
          variant="outline"
          className="flex w-full items-center gap-2"
          size="lg"
          onClick={
            property.contactVerificationRequired
              ? requireEmailVerification
              : requireAuthentication
          }
        >
          <Mail className="h-4 w-4" />
          {tListing(
            property.contactVerificationRequired
              ? "details.verifyEmailToContact"
              : "details.signInToContact",
          )}
        </Button>
      )}

      {!contactLinks.whatsappHref &&
        !contactLinks.emailHref &&
        !property.contactAccessRequired && (
          <Button
            variant="outline"
            className="flex w-full items-center gap-2"
            size="lg"
            disabled
          >
            <Mail className="h-4 w-4" />
            {tListing("details.contactUnavailable")}
          </Button>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-8">
        {property.status === "pending" ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">
                {tListing("details.pendingTitle")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tListing("details.pendingDescription")}
              </p>
            </div>
          </div>
        ) : null}
        {/* Galerie d'images */}
        <div className="-mx-4 w-[calc(100%+2rem)] md:mx-0 md:w-full">
          <ImageGrid images={property.images} title={title} />
        </div>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h1 className="order-2 text-2xl font-bold sm:text-3xl lg:order-1">
                {title}
              </h1>
              <div className="order-3 flex items-start gap-2 text-muted-foreground lg:order-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-sm sm:text-base">{locationLabel}</span>
              </div>
              <div className="order-1 flex flex-wrap items-center gap-2 lg:order-3">
                <FeaturedBadge
                  featuredUntil={property.featuredUntil}
                  status={property.status}
                />
                <Badge variant="secondary">
                  {tListing(
                    `labels.listingTypes.${property.propertyType}` as Parameters<
                      typeof tListing
                    >[0],
                  )}
                </Badge>
                <Badge
                  variant={
                    property.listingMode === "rent" ? "default" : "outline"
                  }
                >
                  {tListing(
                    `labels.listingModes.${property.listingMode}` as Parameters<
                      typeof tListing
                    >[0],
                  )}
                </Badge>
                {property.status === "closed" && (
                  <Badge variant="secondary">
                    {tListing("details.closed")}
                  </Badge>
                )}
              </div>
            </div>

            <div className="hidden min-w-64 text-right lg:block">
              <div className="text-sm text-muted-foreground">
                {tListing(
                  property.listingMode === "sale"
                    ? "details.salePrice"
                    : "details.monthlyRentTotal",
                )}
              </div>
              <PriceDisplay
                price={property.price}
                listingMode={property.listingMode}
                className="text-4xl"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-1 lg:hidden">
            <div className="text-xs text-muted-foreground">
              {tListing(
                property.listingMode === "sale"
                  ? "details.salePrice"
                  : "details.monthlyRentTotal",
                )}
            </div>
            <PriceDisplay
              price={property.price}
              listingMode={property.listingMode}
              className="text-3xl"
            />
          </div>

          {property.listingMode === "rent" &&
          (property.charges !== undefined ||
            property.deposit !== undefined) && (
            <>
              <div className="divide-y rounded-xl bg-muted/45 px-4 lg:hidden">
                {property.charges !== undefined && (
                  <div className="flex items-center justify-between gap-4 py-4 text-sm">
                    <span className="text-muted-foreground">
                      {tListing("details.monthlyCharges")}
                    </span>
                    <PriceDisplay
                      price={property.charges}
                      listingMode="rent"
                      className="text-foreground"
                    />
                  </div>
                )}
                {property.deposit !== undefined && (
                  <div className="flex items-center justify-between gap-4 py-4 text-sm">
                    <span className="text-muted-foreground">
                      {tListing("details.deposit")}
                    </span>
                    <PriceDisplay
                      price={property.deposit}
                      className="text-foreground"
                    />
                  </div>
                )}
              </div>

              <div className="hidden grid-cols-2 gap-8 text-sm lg:grid">
                {property.charges !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {tListing("details.monthlyCharges")}
                    </span>
                    <PriceDisplay
                      price={property.charges}
                      listingMode="rent"
                      className="text-foreground"
                    />
                  </div>
                )}
                {property.deposit !== undefined && (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground">
                      {tListing("details.deposit")}
                    </span>
                    <PriceDisplay
                      price={property.deposit}
                      className="text-foreground"
                    />
                  </div>
                )}
              </div>
            </>
            )}
        </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-8">
          {/* Caractéristiques principales */}
          <div>
            <div className="py-6">
              <h2 className="text-xl font-semibold mb-4">
                {tListing("details.featuresTitle")}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Bed className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium tabular-nums">
                      {formatNumber(property.bedrooms)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tListing("details.bedrooms")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Bath className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium tabular-nums">
                      {formatNumber(property.bathrooms)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tListing("details.bathrooms")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Square className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium tabular-nums whitespace-nowrap">
                      {formatNumber(property.area)}
                      {"\u00a0"}m²
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tListing("details.area")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Layers3 className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">
                      {formatNumber(property.floor)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tListing("details.floorLabel")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Disponibilité et animaux */}
              <div className="mt-6 space-y-3">
                {isActive && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {tListing(
                        property.listingMode === "sale"
                          ? "details.keysAvailable"
                          : "details.available",
                      )}
                    </span>
                    <span>
                      {formatDateWithFallback(
                        property.availableFrom,
                        locale,
                        t("availableNow"),
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <PawPrint className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {tListing("details.pets")}
                  </span>
                  <Badge variant={property.pets ? "default" : "secondary"}>
                    {property.pets
                      ? tListing("details.petsAllowed")
                      : tListing("details.petsDenied")}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <ItemSeparator />
          {/* Description */}
          <div>
            <div className="pt-6 pb-4">
              <h2 className="text-xl font-semibold mb-4">
                {tListing("details.descTitle")}
              </h2>
              <div className="prose prose-sm max-w-none leading-relaxed dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                  {description}
                </ReactMarkdown>
              </div>
            </div>
            <TranslateMenu
              activeLang={activeLang}
              pendingLang={pendingLang}
              onTranslateAction={handleTranslate}
              onResetAction={reset}
            />
          </div>

          <ItemSeparator />
          {/* The optional map always uses a deliberately rounded position. */}
          <div>
            <div className="py-6">
              <h2 className="text-xl font-semibold mb-4">
                {tListing("details.locationTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {locationLabel}
              </p>
            </div>
            {property.location && (
              <LocationMap
                location={property.location}
                city={property.city}
                listing
                approximate
              />
            )}
          </div>

          {/* Équipements et services */}
          {property.extras.length > 0 && (
            <>
              <ItemSeparator />
              <div>
                <div className="py-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {tListing("details.extrasTitle")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {property.extras.map((extra, index) => (
                      <Badge key={index} variant="outline">
                        {extra}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Colonne latérale - Contact */}
        <div className="hidden space-y-6 lg:block">
          <Item
            variant="outline"
            id="contact"
            className="sticky top-24 scroll-mt-24"
          >
            <ItemContent className="">
              <h2 className="text-xl font-semibold mb-4">
                {tListing("details.contactTitle")}
              </h2>

              {/* Informations du propriétaire */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                  <div className="h-full w-full flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <div className="font-medium">
                    {property.authorSlug ? (
                      <Link
                        href={`/hl/${property.authorSlug}`}
                        className="hover:underline"
                      >
                        {property.authorName || tListing("details.anonymous")}
                      </Link>
                    ) : (
                      (property.authorName || tListing("details.anonymous"))
                    )}{" "}
                    <FounderBadge userId={property.authorId} compact />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tListing(
                      property.listingMode === "sale"
                        ? "details.sellerRole"
                        : "details.ownerRole",
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons de contact */}
              {showContactBar && isActive && (
                <>
                  <Separator className="my-4" />
                  {contactActions}
                </>
              )}

              {/* Informations de contact */}
              {(property.contact?.phone || property.contact?.email) && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  {property.contact.phone && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">
                        {tListing("details.phone")}
                      </span>{" "}
                      {property.contact.phone}
                    </div>
                  )}
                  {property.contact.email && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">
                        {tListing("details.email")}
                      </span>{" "}
                      {truncateText(property.contact.email, 20)}
                    </div>
                  )}
                </div>
              )}
            </ItemContent>
          </Item>
        </div>
      </div>
      </div>

      {showContactBar && isActive && (
        <>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.45)] backdrop-blur-md lg:hidden">
            <Button
              type="button"
              size="lg"
              className="mx-auto flex w-full max-w-xl gap-2"
              onClick={() => setContactOpen(true)}
            >
              <MessageCircle className="size-4" />
              {tListing("details.contactOwner")}
            </Button>
          </div>

          <Sheet open={contactOpen} onOpenChange={setContactOpen}>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
            >
              <SheetHeader className="px-0 text-left">
                <SheetTitle>{tListing("details.contactTitle")}</SheetTitle>
                <SheetDescription>
                  {tListing("details.chooseContactMethod")}
                </SheetDescription>
              </SheetHeader>

              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {property.authorSlug ? (
                      <Link
                        href={`/hl/${property.authorSlug}`}
                        className="hover:underline"
                      >
                        {property.authorName || tListing("details.anonymous")}
                      </Link>
                    ) : (
                      (property.authorName || tListing("details.anonymous"))
                    )}{" "}
                    <FounderBadge userId={property.authorId} compact />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tListing(
                      property.listingMode === "sale"
                        ? "details.sellerRole"
                        : "details.ownerRole",
                    )}
                  </div>
                </div>
              </div>

              {contactActions}
            </SheetContent>
          </Sheet>
        </>
      )}
    </>
  );
}
