---
name: posthog-convex
description: PostHog analytics and feature flags for your Convex backend. Use this skill whenever working with PostHog or related Convex component functionality.
version: 2.1.1
---

> Agents: read this skill fully before writing code that uses PostHog. Follow the installation and configuration steps exactly.

# PostHog

## Instructions

The official PostHog component for Convex that integrates analytics event tracking and feature flags into your backend functions. It provides both local feature flag evaluation (cached definitions with reactive queries) and remote evaluation options, plus comprehensive event capture methods for user analytics. Events are captured asynchronously via ctx.scheduler.runAfter to avoid blocking mutations and actions.

### Installation

```bash
npm install @posthog/convex
```

Current npm version: `@posthog/convex@2.1.1`

## Use cases

- **Track user actions in mutations** - Capture events like user registrations, purchases, or feature usage directly in your Convex mutations without blocking the database operation
- **Feature flag conditional logic in queries** - Use locally-evaluated feature flags to conditionally return different data structures or enable experimental features in your query responses
- **A/B test backend behavior** - Control algorithm variations, pricing experiments, or data processing logic by evaluating feature flags within your Convex functions
- **User segmentation and targeting** - Identify users and set properties for targeted feature rollouts based on subscription tiers, user behavior, or other backend-computed attributes
- **Exception tracking with context** - Send structured error reports to PostHog with custom properties and user context when backend operations fail

## How it works

The component registers as a Convex component and creates a PostHog client that forwards API credentials to internal actions. You configure it by setting environment variables for your PostHog API keys and initializing the client in a dedicated file that captures these credentials from process.env.

For feature flags, the component offers two evaluation paths: local evaluation reads from cached flag definitions refreshed by a scheduled cron job, enabling reactive queries that re-run when flags change, while remote evaluation hits PostHog's API directly from actions. Local evaluation works in queries, mutations, and actions but has limitations around experience continuity flags and static cohorts.

Event tracking methods like `posthog.capture()` and `posthog.identify()` use `ctx.scheduler.runAfter` to send data asynchronously, returning immediately without blocking your function execution. The component handles both individual events and bulk operations, with support for user properties, group identification, and exception reporting through dedicated methods.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by PostHog is not needed

## Resources

- [npm package](https://www.npmjs.com/package/%40posthog%2Fconvex)
- [GitHub repository](https://github.com/PostHog/posthog-js/tree/main/packages/convex)
- [Live demo](https://github.com/PostHog/posthog-js/tree/main/examples/example-convex)
- [Convex Components Directory](https://www.convex.dev/components/posthog/convex)
- [Convex documentation](https://docs.convex.dev)