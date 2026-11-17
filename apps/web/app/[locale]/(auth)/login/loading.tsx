import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      {/* Back button */}
      <div className="absolute top-4 left-4 flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-12" />
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md shadow-xl rounded-xl border bg-card p-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>

          <div className="space-y-4">
            {/* Email field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-11 w-full" />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-11 w-full" />
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Submit button */}
            <Skeleton className="h-11 w-full" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
