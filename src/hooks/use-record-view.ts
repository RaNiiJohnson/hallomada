"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { readConsent } from "@/lib/analytics-consent";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";

const VISITOR_KEY = "hallomada.visitorId";

/**
 * Random id that lets the server count an anonymous visitor's views once.
 * Kept on the device only with audience-measurement consent; otherwise
 * nothing is stored and each page view counts on its own. Signed-in members
 * are deduplicated on the server by their account.
 */
function getVisitorId() {
  try {
    if (readConsent() !== "granted") {
      window.localStorage.removeItem(VISITOR_KEY);
      return crypto.randomUUID();
    }
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

type Resource =
  | { type: "listing"; id: Id<"RealestateListing"> }
  | { type: "job"; id: Id<"JobOffer"> };

/** Records one view of a listing or job offer when its page is opened. */
export function useRecordView(resource: Resource | null) {
  const recordView = useMutation(api.stats.recordView);
  const recorded = useRef<string | null>(null);
  const key = resource ? `${resource.type}:${resource.id}` : null;

  useEffect(() => {
    if (!resource || !key || recorded.current === key) return;
    recorded.current = key;
    void recordView({ resource, visitorId: getVisitorId() }).catch(() => {});
    // `resource` is identified by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, recordView]);
}
