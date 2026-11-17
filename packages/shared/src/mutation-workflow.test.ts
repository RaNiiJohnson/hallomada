// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { runMutationWorkflow } from "./mutation-workflow";

describe("critical UI mutation workflows", () => {
  it("runs success effects only after the server acknowledges the mutation", async () => {
    const events: string[] = [];
    let acknowledge = () => {};
    const mutation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          acknowledge = () => {
            events.push("acknowledged");
            resolve();
          };
        }),
    );

    const pending = runMutationWorkflow({
      mutation,
      onSuccess: () => events.push("success"),
      onError: () => events.push("error"),
    });

    expect(events).toEqual([]);
    acknowledge();
    await expect(pending).resolves.toBe(true);
    expect(events).toEqual(["acknowledged", "success"]);
  });

  it("does not emit a false success when the mutation fails", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await expect(
      runMutationWorkflow({
        mutation: async () => {
          throw new Error("server refused the write");
        },
        onSuccess,
        onError,
      }),
    ).resolves.toBe(false);

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
