import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

export default function SkeletonProfile() {
  return (
    <div className="lg:max-w-4xl mx-auto my-4 lg:space-y-4 sm:space-y-2 space-y-1.5 lg:px-0">
      {/* === HEADER SECTION === */}
      <section className="bg-card lg:rounded-lg overflow-hidden">
        {/* Cover Skeleton */}
        <div className="relative w-full h-32 sm:h-40 lg:h-48 bg-muted">
          <Skeleton className="w-full h-32 sm:h-40 lg:h-48 rounded-none" />
        </div>
        {/* Profile Info */}
        <div className="relative px-6 pb-6">
          {/* Avatar Skeleton */}
          <div className="relative -mt-16 sm:-mt-20 mb-4">
            <div className="relative inline-block size-28 sm:size-36 rounded-full border-4 border-card overflow-hidden bg-muted">
              <Image
                src="/random-user.png"
                alt="Avatar Skeleton"
                fill
                sizes="(max-width: 768px) 112px, 144px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Name & Headline Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
              <Skeleton className="h-4 sm:h-5 w-32 sm:w-48" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
