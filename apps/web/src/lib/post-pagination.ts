export function shouldShowPostPagination(result: {
  hasMore: boolean;
  hasPrevPage: boolean;
}) {
  return result.hasMore || result.hasPrevPage;
}
