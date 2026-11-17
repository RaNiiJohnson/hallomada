/// <reference types="vite/client" />

import { describe, expect, it, vi } from "vitest";
import { notifyAdministratorsOfPendingPublication } from "./admin";

describe("administrator publication notifications", () => {
  it("creates one targeted notification for every administrator", async () => {
    const insert = vi.fn(async () => "notification-id");
    const ctx = {
      runQuery: vi.fn(async () => ["admin-1", "admin-2"]),
      db: { insert },
    };

    await notifyAdministratorsOfPendingPublication(ctx as never, {
      resourceType: "job",
      title: "Pending job",
      authorName: "Member One",
    });

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledWith("notifications", {
      userId: "admin-1",
      type: "job_pending_review",
      read: false,
      fromUserName: "Member One",
      message: "Pending job",
      targetHref: "/admin/moderation",
    });
  });
});
