import aggregate from "@convex-dev/aggregate/convex.config.js";
import migrations from "@convex-dev/migrations/convex.config";
import r2 from "@convex-dev/r2/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";
import cloudinary from "@imaxis/cloudinary-convex/convex.config";
import convexCascadingDeletes from "@sholajegede/convex-cascading-deletes/convex.config.js";
import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";

import { v } from "convex/values";
import posthog from "@posthog/convex/convex.config.js";

const app = defineApp({
  env: {
    // Required. PostHog project token (`phc_…`) — used to send events and evaluate flags remotely.
    POSTHOG_PROJECT_TOKEN: v.string(),
    // Optional. PostHog host. Defaults to `https://us.i.posthog.com`; use `https://eu.i.posthog.com` for EU Cloud or your self-hosted URL.
    POSTHOG_HOST: v.optional(v.string()),
    // Optional. A feature flags secure API key (`phs_…`, recommended) or personal API key (`phx_…`). Setting it enables local feature flag evaluation.
    POSTHOG_PERSONAL_API_KEY: v.optional(v.string()),
    // Optional. Cron interval (seconds) for refreshing flag definitions. Defaults to 60. Raise it on free-tier dev deployments to reduce function-call usage.
    POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS: v.optional(v.string()),
  },
});

app.use(posthog, {
  env: {
    POSTHOG_PROJECT_TOKEN: app.env.POSTHOG_PROJECT_TOKEN,
    POSTHOG_HOST: app.env.POSTHOG_HOST,
    POSTHOG_PERSONAL_API_KEY: app.env.POSTHOG_PERSONAL_API_KEY,
    POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS:
      app.env.POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS,
  },
});

app.use(betterAuth);
app.use(cloudinary);
app.use(stripe);
app.use(convexCascadingDeletes);
app.use(resend);
app.use(r2);
app.use(rateLimiter);

app.use(aggregate, { name: "aggregateByLikesPosts" });
app.use(aggregate, { name: "aggregateByLikesComments" });
app.use(aggregate, { name: "aggregateByComments" });
app.use(aggregate, { name: "aggregateByCommunityPosts" });
app.use(aggregate, { name: "aggregateByCommunityMembers" });
app.use(aggregate, { name: "postShuffle" });
app.use(aggregate, { name: "postSortedByDate" });
app.use(aggregate, { name: "postSortedByLikes" });

app.use(migrations);

export default app;
