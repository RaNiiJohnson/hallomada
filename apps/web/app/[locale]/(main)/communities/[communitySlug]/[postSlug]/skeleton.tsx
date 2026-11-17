import { Skeleton } from "@/components/ui/skeleton";
import { ComListSkeleton } from "../../_component/List/ComListSkeleton";

export default function SkeletonPost() {
  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 pt-2 sm:pt-8 mb-2 sm:mb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="max-w-3xl mx-auto py-2 space-y-4">
        {/* Article */}
        <ComListSkeleton />
      </div>
    </div>
  );
}
