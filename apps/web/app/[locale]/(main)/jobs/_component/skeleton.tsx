import { Skeleton } from "@/components/ui/skeleton";

export function JobFiltersSkeleton() {
  return (
    <div>
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Barre de recherche skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
        </div>

        {/* Filtres rapides skeleton */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>

      {/* Actions bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 my-8">
        <div className="flex items-center gap-2" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}

export function JobPageSkeleton() {
  return (
    <>
      <div className="space-y-4 mt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                {/* Title skeleton */}
                <Skeleton className="h-6 w-3/4" />

                {/* Company skeleton */}
                <Skeleton className="h-4 w-1/4" />

                {/* Location, Type & Salary skeleton */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>

                {/* Badges skeleton */}
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>

              {/* Date skeleton */}
              <div className="shrink-0">
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function JobDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 animate-pulse">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="h-9 bg-muted rounded w-40"></div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Job Header */}
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <Skeleton className="h-8 sm:h-10 w-full max-w-md" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pb-6 border-b">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-10 w-24" />
                  </div>

                  {/* Job Details */}
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-3 pt-4 border-t">
                    <Skeleton className="h-6 w-48" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>

                  {/* Certificates */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-6 w-36" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-7 w-20 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-6">
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full max-w-md" />
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Skeleton className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Company Info Card */}
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-6">
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            </div>

            {/* Publisher Info */}
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-6">
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>

            {/* Job Summary */}
            <div className="bg-muted/30 border rounded-lg shadow-sm">
              <div className="p-6">
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between py-2 border-b">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
