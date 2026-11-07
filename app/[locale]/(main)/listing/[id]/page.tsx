"use client";

import { ShareButton } from "@/components/ShareButton";
import { MobileActionsMenu } from "@/components/mobile-actions-menu";
import { ReportDialog } from "@/components/report-dialog";
import { Button } from "@/components/ui/button";
import { InputGroup } from "@/components/ui/input-group";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { Link } from "@/i18n/navigation";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex-helpers/react/cache";
import { useConvexAuth, useMutation } from "convex/react";
import { ArrowLeft, Heart, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { ListingLifecycleActions } from "../_component/listingLifecycleActions";
import { PropertyPageSkeleton } from "../_component/skeleton";
import { PropertyDetails } from "./components/PropertyDetails";
import { ReceivedRentalFiles } from "@/components/rental-file/received-rental-files";
import { PublicationStats } from "@/components/featured/publication-stats";
import { useRecordView } from "@/hooks/use-record-view";
import { SimilarListings } from "./components/SimilarListings";

export default function PropertyPage() {
  const params = useParams<{ id: string }>();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const requireAuthentication = useAuthRequiredAction();
  const t = useTranslations("listing");
  const toggleBookmark = useMutation(api.bookmarks.mutations.toggleBookmark);
  const user = useQuery(api.auth.auth.getCurrentUser);

  const property = useQuery(api.listings.queries.getListingWithContact, {
    slug: params.id,
  });
  useRecordView(property ? { type: "listing", id: property._id } : null);

  if (property === undefined) {
    return <PropertyPageSkeleton />;
  }

  if (property === null) {
    notFound();
  }

  const actionsReady = !isLoading && user !== undefined;
  const canManage = actionsReady && user?._id === property.authorId;
  const showVisitorActions = actionsReady && !canManage;

  const renderActions = () => (
    <>
      {canManage && (
        <ListingLifecycleActions
          listingId={property._id}
          status={property.status}
        />
      )}
      <ShareButton text={property.title} showLabel />
      {user !== undefined && user?._id !== property.authorId ? (
        <ReportDialog
          target={{ type: "listing", id: property._id }}
          showLabel
          size="sm"
          variant="outline"
        />
      ) : null}
      {canManage ? (
        <Button size="sm" className="gap-2" asChild>
          <Link href={`/listing/${params.id}/edit`}>
            <Pencil className="size-4" />
            <span>{t("dialogs.edit.trigger")}</span>
          </Link>
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className={`flex items-center gap-2 ${property.isBookmarked ? "text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20" : ""}`}
          onClick={async () => {
            if (!isAuthenticated) {
              requireAuthentication();
              return;
            }

            try {
              await toggleBookmark({
                resourceId: property._id as Id<"RealestateListing">,
                resourceType: "realEstate",
              });
              toast.success(
                property.isBookmarked
                  ? t("details.bookmarkRemove")
                  : t("details.bookmarkAdd"),
              );
            } catch {
              toast.error(t("details.bookmarkError"));
            }
          }}
        >
          <Heart
            className={`h-4 w-4 ${property.isBookmarked ? "fill-current" : ""}`}
          />
          <span>
            {property.isBookmarked
              ? t("details.bookmarkRemoveLabel")
              : t("details.bookmarkAddLabel")}
          </span>
        </Button>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header avec navigation */}
      <div className="sticky top-0 z-20 mx-auto flex max-w-full items-center justify-between gap-2 border-b bg-background/70 px-4 py-3 backdrop-blur-md supports-backdrop-filter:bg-background/60 sm:py-4">
        <Button variant="ghost" size="sm" className="-ml-2 px-2" asChild>
          <Link href="/listing">
            <ArrowLeft className="h-4 w-4" />
            {t("details.backBtn")}
          </Link>
        </Button>

        {actionsReady && (
          <div className="ml-auto flex items-center gap-2">
            <InputGroup className="hidden h-auto w-fit max-w-full flex-wrap justify-center overflow-hidden rounded-lg bg-background sm:flex *:shrink-0 *:rounded-none! *:border-0! [&>*:not(:last-child)]:border-r!">
              {renderActions()}
            </InputGroup>
            <MobileActionsMenu>{renderActions()}</MobileActionsMenu>
          </div>
        )}
      </div>

      <div
        className={`mx-auto max-w-5xl px-4 pt-0 sm:pt-8 ${showVisitorActions ? "pb-24 lg:pb-8" : "pb-4 sm:pb-8"}`}
      >
        <PropertyDetails
          property={property}
          showContactBar={showVisitorActions}
        />
        {canManage && (
          <PublicationStats
            resource={{ type: "listing", id: property._id }}
            className="mt-6 sm:mt-8"
          />
        )}
        {canManage && property.acceptsRentalFile === true && (
          <ReceivedRentalFiles listingId={property._id} />
        )}
        {/* Section des annonces similaires */}
        <div className="mt-6 sm:mt-8">
          <SimilarListings slug={params.id} property={property} />
        </div>
      </div>
    </div>
  );
}
