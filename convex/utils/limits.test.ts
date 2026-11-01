import { describe, expect, it } from "vitest";
import {
  assertMessageContent,
  assertStringList,
  assertTextLimits,
  MAX_LIST_ITEMS,
} from "./limits";

describe("server-side text limits", () => {
  it("accepts values within the limits", () => {
    expect(() => assertTextLimits({ title: "abc" }, { title: 3 })).not.toThrow();
    expect(() => assertTextLimits({}, { title: 3 })).not.toThrow();
  });

  it("rejects values over the limit", () => {
    expect(() => assertTextLimits({ title: "abcd" }, { title: 3 })).toThrow();
  });

  it("rejects empty and oversized messages", () => {
    expect(() => assertMessageContent("Message", "   ", 10)).toThrow();
    expect(() => assertMessageContent("Message", "x".repeat(11), 10)).toThrow();
    expect(() => assertMessageContent("Message", "hello", 10)).not.toThrow();
  });

  it("bounds list size and item length", () => {
    expect(() =>
      assertStringList("extras", Array(MAX_LIST_ITEMS + 1).fill("a")),
    ).toThrow();
    expect(() => assertStringList("extras", ["x".repeat(101)])).toThrow();
    expect(() => assertStringList("extras", ["wifi"])).not.toThrow();
  });
});
