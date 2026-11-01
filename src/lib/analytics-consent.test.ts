// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  parseConsent,
  readConsent,
  subscribeConsent,
  writeConsent,
} from "./analytics-consent";

function stubBrowser() {
  const store = new Map<string, string>();
  const target = new EventTarget();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  vi.stubGlobal("window", {
    localStorage,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  });
  return localStorage;
}

describe("analytics consent", () => {
  let localStorage: ReturnType<typeof stubBrowser>;
  beforeEach(() => {
    localStorage = stubBrowser();
  });

  it("has no choice recorded by default, so analytics stay off", () => {
    expect(readConsent()).toBeNull();
  });

  it("only accepts known values", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });

  it("stores, changes and clears the choice", () => {
    writeConsent("granted");
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("granted");
    writeConsent("denied");
    expect(readConsent()).toBe("denied");
    writeConsent(null);
    expect(readConsent()).toBeNull();
  });

  it("notifies subscribers when the choice changes", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeConsent(onChange);
    writeConsent("granted");
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    writeConsent("denied");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
