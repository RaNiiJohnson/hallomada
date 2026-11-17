/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMutationWorkflow } from "@hallomada/shared/mutation-workflow";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

type TestUser = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  role: "admin" | "user";
  userType: "admin" | "seeker" | "provider" | null;
  banned: boolean;
  city: string | null;
  slug: string | null;
  image: string | null;
};

const authState = vi.hoisted(() => ({
  actor: {
    _id: "actor-admin",
    id: "actor-admin",
    name: "Current Admin",
    email: "admin@example.com",
    role: "admin" as "admin" | "user",
  },
  users: [] as TestUser[],
  listQueries: [] as Array<Record<string, unknown>>,
  calls: [] as string[],
  failBan: false,
}));

vi.mock("./auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth")>();

  const listUsers = vi.fn(async ({ query }: { query: Record<string, unknown> }) => {
    authState.listQueries.push(query);
    let users = [...authState.users];
    const searchValue = String(query.searchValue ?? "").toLocaleLowerCase();
    if (searchValue) {
      const field = query.searchField === "email" ? "email" : "name";
      users = users.filter((user) =>
        user[field].toLocaleLowerCase().includes(searchValue),
      );
    }
    if (query.filterField) {
      const field = query.filterField as keyof TestUser;
      users = users.filter((user) => {
        const value = user[field];
        if (query.filterOperator === "gte") {
          return Number(value) >= Number(query.filterValue);
        }
        return value === query.filterValue;
      });
    }
    const direction = query.sortDirection === "desc" ? -1 : 1;
    if (query.sortBy) {
      const field = query.sortBy as keyof TestUser;
      users.sort((left, right) =>
        String(left[field]).localeCompare(String(right[field])) * direction,
      );
    }
    const total = users.length;
    const limit = Number(query.limit ?? 20);
    const offset = Number(query.offset ?? 0);
    return { users: users.slice(offset, offset + limit), total, limit, offset };
  });

  const apiMock = {
    listUsers,
    getUser: vi.fn(async ({ query }: { query: { id: string } }) => {
      const user = authState.users.find((candidate) => candidate.id === query.id);
      if (!user) throw new Error("User not found");
      return user;
    }),
    banUser: vi.fn(async ({ body }: { body: { userId: string } }) => {
      authState.calls.push(`ban:${body.userId}`);
      if (authState.failBan) throw new Error("server refused ban");
      const target = authState.users.find((user) => user.id === body.userId);
      if (target) target.banned = true;
    }),
    unbanUser: vi.fn(async ({ body }: { body: { userId: string } }) => {
      authState.calls.push(`unban:${body.userId}`);
      const target = authState.users.find((user) => user.id === body.userId);
      if (target) target.banned = false;
    }),
    setRole: vi.fn(
      async ({ body }: { body: { userId: string; role: "admin" | "user" } }) => {
        authState.calls.push(`role:${body.userId}:${body.role}`);
        const target = authState.users.find((user) => user.id === body.userId);
        if (target) target.role = body.role;
      },
    ),
    adminUpdateUser: vi.fn(
      async ({ body }: { body: { userId: string; data: { userType: string } } }) => {
        authState.calls.push(`type:${body.userId}:${body.data.userType}`);
        const target = authState.users.find((user) => user.id === body.userId);
        if (
          target &&
          (body.data.userType === "admin" ||
            body.data.userType === "seeker" ||
            body.data.userType === "provider")
        ) {
          target.userType = body.data.userType;
        }
      },
    ),
    createUser: vi.fn(async ({
      body,
    }: {
      body: { email: string; name: string; role: "admin" | "user" };
    }) => {
      authState.calls.push(`create:${body.email}`);
      return {
        user: {
          id: "created-user",
          name: body.name,
          email: body.email,
          role: body.role,
        },
      };
    }),
  };

  return {
    ...actual,
    requireAdmin: vi.fn(async () => {
      if (authState.actor.role !== "admin") throw new Error("Admin access required");
      return { user: authState.actor };
    }),
    authComponent: {
      ...actual.authComponent,
      getAuth: vi.fn(async () => ({
        auth: { api: apiMock },
        headers: new Headers(),
      })),
    },
  };
});

function user(overrides: Partial<TestUser> & Pick<TestUser, "id" | "name" | "email">): TestUser {
  return {
    createdAt: 1,
    role: "user",
    userType: "seeker",
    banned: false,
    city: null,
    slug: overrides.id,
    image: null,
    ...overrides,
  };
}

describe("admin user management", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    authState.actor.role = "admin";
    authState.actor._id = "actor-admin";
    authState.users = [
      user({
        id: "user-1",
        name: "Alice Alpha",
        email: "alice@example.com",
        createdAt: 100,
      }),
      user({
        id: "user-2",
        name: "Bob Beta",
        email: "bob@example.com",
        createdAt: 200,
        banned: true,
        userType: "provider",
      }),
      user({
        id: "admin-1",
        name: "Clara Admin",
        email: "clara@example.com",
        createdAt: 300,
        role: "admin",
        userType: "admin",
      }),
    ];
    authState.listQueries = [];
    authState.calls = [];
    authState.failBan = false;
    t = convexTest(schema, modules);
  });

  it("refuses access to a non-admin", async () => {
    authState.actor.role = "user";
    await expect(
      t.query(api.auth.admin.listUsers, { limit: 20, offset: 0 }),
    ).rejects.toThrow("Admin access required");
  });

  it("returns exact pagination metadata and bounds the page size", async () => {
    const result = await t.query(api.auth.admin.listUsers, {
      limit: 200,
      offset: 1,
      sort: { field: "createdAt", direction: "asc" },
    });

    expect(result).toMatchObject({ total: 3, limit: 50, offset: 1 });
    expect(result.users.map((entry) => entry.id)).toEqual(["user-2", "admin-1"]);
    expect(authState.listQueries[authState.listQueries.length - 1]).toMatchObject({ limit: 50, offset: 1 });
  });

  it("sends search and filters to Better Auth before pagination", async () => {
    const searched = await t.query(api.auth.admin.listUsers, {
      limit: 10,
      offset: 0,
      search: { value: "bob@", field: "email", operator: "contains" },
      filter: { field: "banned", value: true },
      sort: { field: "email", direction: "asc" },
    });

    expect(searched.total).toBe(1);
    expect(searched.users[0]?.id).toBe("user-2");
    expect(authState.listQueries[authState.listQueries.length - 1]).toMatchObject({
      searchValue: "bob@",
      searchField: "email",
      searchOperator: "contains",
      filterField: "banned",
      filterValue: true,
      filterOperator: "eq",
      sortBy: "email",
      sortDirection: "asc",
    });
  });

  it("calculates dashboard metrics from Better Auth totals", async () => {
    const dashboard = await t.query(api.auth.admin.getDashboard, {
      windowStart: 200,
      asOf: 1_000,
    });

    expect(dashboard).toMatchObject({
      totalMembers: 3,
      newMembers: 2,
      bannedMembers: 1,
      windowStart: 200,
      asOf: 1_000,
    });
    expect(dashboard.recentMembers.map((member) => member.id)).toEqual([
      "admin-1",
      "user-2",
      "user-1",
    ]);
    expect(authState.listQueries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filterField: "createdAt",
          filterValue: 200,
          filterOperator: "gte",
        }),
        expect.objectContaining({
          filterField: "banned",
          filterValue: true,
          filterOperator: "eq",
        }),
      ]),
    );
  });

  it("bounds the recent dashboard list to five members", async () => {
    authState.users = Array.from({ length: 8 }, (_, index) =>
      user({
        id: `user-${index}`,
        name: `User ${index}`,
        email: `user-${index}@example.com`,
        createdAt: index,
      }),
    );

    const dashboard = await t.query(api.auth.admin.getDashboard, {
      windowStart: 0,
      asOf: 1_000,
    });

    expect(dashboard.totalMembers).toBe(8);
    expect(dashboard.recentMembers).toHaveLength(5);
    expect(dashboard.recentMembers.map((member) => member.id)).toEqual([
      "user-7",
      "user-6",
      "user-5",
      "user-4",
      "user-3",
    ]);
  });

  it("refuses invalid dashboard windows and non-admin access", async () => {
    await expect(
      t.query(api.auth.admin.getDashboard, {
        windowStart: 1_001,
        asOf: 1_000,
      }),
    ).rejects.toThrow("between 0 and 31 days");

    authState.actor.role = "user";
    await expect(
      t.query(api.auth.admin.getDashboard, {
        windowStart: 0,
        asOf: 1_000,
      }),
    ).rejects.toThrow("Admin access required");
  });

  it("records every successful sensitive user administration action", async () => {
    await t.mutation(api.auth.admin.banUser, { userId: "user-1" });
    await t.mutation(api.auth.admin.unbanUser, { userId: "user-1" });
    await t.mutation(api.auth.admin.setUserRole, {
      userId: "user-1",
      role: "admin",
    });
    await t.mutation(api.auth.admin.setUserType, {
      userId: "user-1",
      userType: "provider",
    });
    await t.mutation(api.auth.admin.createUser, {
      email: "new-user@example.com",
      password: "not-recorded-password",
      name: "New User",
      role: "user",
      userType: "seeker",
    });

    const audit = await t.query(api.adminAudit.list, {
      paginationOpts: { numItems: 20, cursor: null },
    });

    expect(audit.page).toHaveLength(5);
    expect(audit.page.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "user_created",
        "user_banned",
        "user_unbanned",
        "user_role_changed",
        "user_type_changed",
      ]),
    );
    expect(audit.page).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          administratorId: "actor-admin",
          administratorLabel: "Current Admin",
          targetType: "user",
        }),
        expect.objectContaining({
          action: "user_role_changed",
          metadata: { role: "admin" },
        }),
        expect.objectContaining({
          action: "user_type_changed",
          metadata: { userType: "provider" },
        }),
      ]),
    );

    const serializedAudit = JSON.stringify(audit.page);
    expect(serializedAudit).not.toContain("not-recorded-password");
    expect(serializedAudit).not.toContain("new-user@example.com");
    expect(serializedAudit).not.toMatch(/token|password|cv|signedUrl/i);
  });

  it("does not record a success event when the operation fails", async () => {
    authState.failBan = true;

    await expect(
      t.mutation(api.auth.admin.banUser, { userId: "user-1" }),
    ).rejects.toThrow("server refused ban");

    const audit = await t.query(api.adminAudit.list, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(audit.page).toEqual([]);
  });

  it("does not record unchanged administrative state as an action", async () => {
    await t.mutation(api.auth.admin.unbanUser, { userId: "user-1" });
    await t.mutation(api.auth.admin.setUserRole, {
      userId: "user-1",
      role: "user",
    });
    await t.mutation(api.auth.admin.setUserType, {
      userId: "user-1",
      userType: "seeker",
    });

    const audit = await t.query(api.adminAudit.list, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(audit.page).toEqual([]);
  });

  it("refuses audit access to a non-admin", async () => {
    authState.actor.role = "user";

    await expect(
      t.query(api.adminAudit.list, {
        paginationOpts: { numItems: 20, cursor: null },
      }),
    ).rejects.toThrow("Admin access required");
  });

  it("paginates audit events in reverse chronological order", async () => {
    await t.run(async (ctx) => {
      for (const occurredAt of [100, 300, 200]) {
        await ctx.db.insert("adminAuditEvents", {
          administratorId: "actor-admin",
          action: "user_banned",
          targetType: "user",
          targetId: `user-${occurredAt}`,
          occurredAt,
        });
      }
    });

    const firstPage = await t.query(api.adminAudit.list, {
      paginationOpts: { numItems: 2, cursor: null },
    });
    const secondPage = await t.query(api.adminAudit.list, {
      paginationOpts: {
        numItems: 2,
        cursor: firstPage.continueCursor,
      },
    });

    expect(firstPage.page.map((event) => event.occurredAt)).toEqual([300, 200]);
    expect(secondPage.page.map((event) => event.occurredAt)).toEqual([100]);
    expect(secondPage.isDone).toBe(true);
  });

  it("rejects invalid roles and user types at the public boundary", async () => {
    await expect(
      t.mutation(api.auth.admin.setUserRole, {
        userId: "user-1",
        role: "owner",
      } as never),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.auth.admin.setUserType, {
        userId: "user-1",
        userType: "unknown",
      } as never),
    ).rejects.toThrow();
  });

  it("refuses self-ban, self-demotion, and self-deletion", async () => {
    await expect(
      t.mutation(api.auth.admin.banUser, { userId: "actor-admin" }),
    ).rejects.toThrow("Cannot ban your own account");
    await expect(
      t.mutation(api.auth.admin.setUserRole, {
        userId: "actor-admin",
        role: "user",
      }),
    ).rejects.toThrow("Cannot change your own administrator role");
    await expect(
      t.action(api.auth.admin.deleteUser, { userId: "actor-admin" }),
    ).rejects.toThrow("Cannot delete your own account");
  });

  it("protects the last administrator from demotion and deletion", async () => {
    authState.users = [
      user({
        id: "last-admin",
        name: "Last Admin",
        email: "last@example.com",
        role: "admin",
        userType: "admin",
      }),
    ];

    await expect(
      t.mutation(api.auth.admin.setUserRole, {
        userId: "last-admin",
        role: "user",
      }),
    ).rejects.toThrow("last administrator");
    await expect(
      t.action(api.auth.admin.deleteUser, { userId: "last-admin" }),
    ).rejects.toThrow("last administrator");
    expect(authState.calls).not.toContain("role:last-admin:user");
  });

  it("keeps permanent deletion unavailable when a cascade is not recoverable", async () => {
    authState.users.push(
      user({
        id: "admin-2",
        name: "Second Admin",
        email: "second@example.com",
        role: "admin",
        userType: "admin",
      }),
    );
    await expect(
      t.action(api.auth.admin.deleteUser, { userId: "admin-1" }),
    ).rejects.toThrow("Permanent user deletion is unavailable");
  });

  it("creates users without accepting a fake client user id", async () => {
    await t.mutation(api.auth.admin.createUser, {
      email: "new@example.com",
      password: "password123",
      name: "New User",
      role: "user",
      userType: "seeker",
    });
    expect(authState.calls).toContain("create:new@example.com");

    await expect(
      t.mutation(api.auth.admin.createUser, {
        userId: "client-generated",
        email: "other@example.com",
        password: "password123",
        name: "Other User",
        role: "user",
        userType: "seeker",
      } as never),
    ).rejects.toThrow();
  });

  it("waits for server success before UI success feedback", async () => {
    const events: string[] = [];
    let acknowledge = () => {};
    const pending = runMutationWorkflow({
      mutation: () =>
        new Promise<void>((resolve) => {
          acknowledge = () => {
            events.push("server");
            resolve();
          };
        }),
      onSuccess: () => events.push("toast-success"),
      onError: () => events.push("toast-error"),
    });

    expect(events).toEqual([]);
    acknowledge();
    await pending;
    expect(events).toEqual(["server", "toast-success"]);
  });

  it("does not show a positive UI toast after a server failure", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    await runMutationWorkflow({
      mutation: async () => {
        throw new Error("server failure");
      },
      onSuccess,
      onError,
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });
});
