"use client";

import { ReactNode, useEffect, useRef } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { identifyUser, resetIdentity } from "@/lib/analytics";
import {
  AnalyticsConsentManager,
  useAnalyticsConsent,
} from "@/components/analytics-consent";

import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function PostHogIdentity() {
  const user = useQuery(api.auth.auth.getCurrentUser);
  const consent = useAnalyticsConsent();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (user === undefined) return;
    if (consent !== "granted") {
      identifiedUserId.current = null;
      return;
    }

    if (user === null) {
      if (identifiedUserId.current) {
        resetIdentity();
        identifiedUserId.current = null;
      }
      return;
    }

    const userId = `${user._id}`;

    if (identifiedUserId.current === userId) return;

    if (identifiedUserId.current) {
      resetIdentity();
    }

    identifyUser(userId, { role: `${user.userType ?? ""}` });
    identifiedUserId.current = userId;
  }, [user, consent]);

  return null;
}

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Known type mismatch between better-auth plugin generics and ConvexBetterAuthProvider's AuthClient type
      authClient={authClient as any}
      initialToken={initialToken}
    >
      <ConvexQueryCacheProvider>
        <PostHogIdentity />
        <AnalyticsConsentManager />
        {children}
      </ConvexQueryCacheProvider>
    </ConvexBetterAuthProvider>
  );
}
