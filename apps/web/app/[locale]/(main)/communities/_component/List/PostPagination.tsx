"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PAGE_SIZE, PostsResults, SortMode } from "./types";

// Pagination helper
function getPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: number[] = [1];
  if (currentPage > 3) pages.push(-1);

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (currentPage < totalPages - 2) pages.push(-1);
  pages.push(totalPages);
  return pages;
}

export function PostPagination({
  mode,
  result,
  currentPage,
  loading,
  onGoToPageAction,
}: {
  mode: SortMode;
  result: PostsResults;
  currentPage: number;
  loading: boolean;
  onGoToPageAction: (page: number) => void;
}) {
  const t = useTranslations("common");
  const isNumbered = mode !== "shuffle";
  const totalPages = isNumbered ? Math.ceil(result.totalCount / PAGE_SIZE) : 0;
  const visiblePages = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const prevDisabled = !result.hasPrevPage || loading;
  const nextDisabled = !result.hasMore || loading;

  return (
    <Pagination className="py-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            label={t("prev")}
            onClick={() => onGoToPageAction(currentPage - 1)}
            className={
              prevDisabled ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>

        {isNumbered &&
          visiblePages.map((pageNum, idx) =>
            pageNum === -1 ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  isActive={pageNum === currentPage}
                  onClick={() => onGoToPageAction(pageNum)}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

        <PaginationItem>
          <PaginationNext
            label={t("next")}
            onClick={() => onGoToPageAction(currentPage + 1)}
            className={
              nextDisabled ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
