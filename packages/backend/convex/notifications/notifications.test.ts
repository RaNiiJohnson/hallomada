/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";

const authState = vi.hoisted(() => ({ userId: "testUserId" }));

vi.mock("../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn().mockImplementation(async () => ({
      user: {
        _id: authState.userId,
        id: authState.userId,
        name: "Test User",
      },
    })),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn().mockResolvedValue({
        _id: "testUserId",
        name: "Test User",
      }),
    },
  };
});

describe("Notifications", () => {
  let t: ReturnType<typeof convexTest>;
  let notificationId: Id<"notifications">;

  beforeEach(async () => {
    authState.userId = "testUserId";
    t = convexTest(schema, modules);

    notificationId = await t.run(async (ctx) => {
      return await ctx.db.insert("notifications", {
        userId: "testUserId",
        type: "new_like",
        read: false,
        fromUserName: "Someone",
        message: "Liked your post",
      });
    });
  });

  it("should mark one notification as read", async () => {
    await t.mutation(api.notifications.mutations.markOneRead, {
      notificationId,
    });

    const notif = await t.run(async (ctx) => await ctx.db.get(notificationId));
    expect(notif?.read).toBe(true);
  });

  it("should mark all notifications as read", async () => {
    await t.mutation(api.notifications.mutations.markAllRead, {});

    const notif = await t.run(async (ctx) => await ctx.db.get(notificationId));
    expect(notif?.read).toBe(true);
  });

  it("should refuse to modify another user's notification", async () => {
    authState.userId = "anotherUserId";

    await expect(
      t.mutation(api.notifications.mutations.markOneRead, { notificationId }),
    ).rejects.toThrow("Not allowed to update this notification");

    const notif = await t.run(async (ctx) => await ctx.db.get(notificationId));
    expect(notif?.read).toBe(false);
  });

  it("only returns the signed-in member's paginated notification history", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("notifications", {
        userId: "anotherUserId",
        type: "new_like",
        read: false,
        fromUserName: "Someone else",
        message: "Private to another member",
      });
    });

    const result = await t.query(api.notifications.queries.getMyNotificationsPage, {
      paginationOpts: { cursor: null, numItems: 10 },
    });

    expect(result.page).toHaveLength(1);
    expect(result.page[0]._id).toBe(notificationId);
    expect(JSON.stringify(result)).not.toContain("anotherUserId");
  });
});
