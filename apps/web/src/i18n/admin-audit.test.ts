// @vitest-environment node

import { describe, expect, it } from "vitest";
import de from "../../messages/de/admin.json";
import en from "../../messages/en/admin.json";
import fr from "../../messages/fr/admin.json";
import { ADMIN_AUDIT_ACTIONS } from "@convex/adminAuditValues";

describe("admin audit localization", () => {
  it("provides every visible action in all three locales", () => {
    for (const messages of [fr, en, de]) {
      expect(messages.audit.loading).toBeTruthy();
      expect(messages.audit.emptyTitle).toBeTruthy();
      expect(messages.audit.columns).toEqual(
        expect.objectContaining({
          action: expect.any(String),
          administrator: expect.any(String),
          target: expect.any(String),
          date: expect.any(String),
        }),
      );

      for (const action of ADMIN_AUDIT_ACTIONS) {
        expect(messages.audit.actions[action]).toEqual(expect.any(String));
        expect(messages.audit.actions[action].length).toBeGreaterThan(0);
      }
    }
  });

  it("does not reuse one locale's visible labels for another", () => {
    expect(fr.audit.actions.user_banned).not.toBe(
      en.audit.actions.user_banned,
    );
    expect(de.audit.actions.user_banned).not.toBe(
      en.audit.actions.user_banned,
    );
  });
});
