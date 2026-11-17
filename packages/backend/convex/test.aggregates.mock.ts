/**
 * Shared mock factory for aggregates module.
 * convex-test doesn't support Convex components, so we need to stub
 * all TableAggregate instances used across the app.
 */
const createMockAggregate = () => ({
  trigger: () => async () => {},
  insert: async () => {},
  delete: async () => {},
  replace: async () => {},
  count: async () => 0,
  insertIfDoesNotExist: async () => {},
  at: async () => ({ id: "", key: null }),
  clear: async () => {},
});

export const aggregatesMock = {
  postLikesCount: createMockAggregate(),
  postCommentsCount: createMockAggregate(),
  communityPostsCount: createMockAggregate(),
  postShuffle: createMockAggregate(),
  postSortedByDate: createMockAggregate(),
  postSortedByLikes: createMockAggregate(),
  communityMembersCount: createMockAggregate(),
  migrations: { define: () => ({}), runner: () => ({}) },
  run: {},
};
