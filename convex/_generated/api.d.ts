/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAudit from "../adminAudit.js";
import type * as adminAuditValues from "../adminAuditValues.js";
import type * as aggregates from "../aggregates.js";
import type * as alerts_dispatch from "../alerts/dispatch.js";
import type * as alerts_emails from "../alerts/emails.js";
import type * as alerts_mutations from "../alerts/mutations.js";
import type * as alerts_queries from "../alerts/queries.js";
import type * as alerts_values from "../alerts/values.js";
import type * as auth_admin from "../auth/admin.js";
import type * as auth_auth from "../auth/auth.js";
import type * as auth_users from "../auth/users.js";
import type * as bookmarks_migrations from "../bookmarks/migrations.js";
import type * as bookmarks_mutations from "../bookmarks/mutations.js";
import type * as bookmarks_queries from "../bookmarks/queries.js";
import type * as cascadeDeletes from "../cascadeDeletes.js";
import type * as cascadeHelpers from "../cascadeHelpers.js";
import type * as chat_mutations from "../chat/mutations.js";
import type * as chat_queries from "../chat/queries.js";
import type * as communities_actions from "../communities/actions.js";
import type * as communities_mutations from "../communities/mutations.js";
import type * as communities_queries from "../communities/queries.js";
import type * as crons from "../crons.js";
import type * as debug_aggregates from "../debug_aggregates.js";
import type * as email from "../email.js";
import type * as emails_layout from "../emails/layout.js";
import type * as emails_strings from "../emails/strings.js";
import type * as emails_templates from "../emails/templates.js";
import type * as founders from "../founders.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as integrations_cloudinary from "../integrations/cloudinary.js";
import type * as integrations_posthog from "../integrations/posthog.js";
import type * as integrations_r2 from "../integrations/r2.js";
import type * as integrations_stripe from "../integrations/stripe.js";
import type * as jobs_actions from "../jobs/actions.js";
import type * as jobs_applicationCv from "../jobs/applicationCv.js";
import type * as jobs_emailEvents from "../jobs/emailEvents.js";
import type * as jobs_mutations from "../jobs/mutations.js";
import type * as jobs_queries from "../jobs/queries.js";
import type * as jobs_translate from "../jobs/translate.js";
import type * as listings_imageUrls from "../listings/imageUrls.js";
import type * as listings_mutations from "../listings/mutations.js";
import type * as listings_privacy from "../listings/privacy.js";
import type * as listings_queries from "../listings/queries.js";
import type * as listings_translate from "../listings/translate.js";
import type * as me_queries from "../me/queries.js";
import type * as notifications_admin from "../notifications/admin.js";
import type * as notifications_mutations from "../notifications/mutations.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as posts_actions from "../posts/actions.js";
import type * as posts_comments_mutations from "../posts/comments/mutations.js";
import type * as posts_likes_mutations from "../posts/likes/mutations.js";
import type * as posts_mutations from "../posts/mutations.js";
import type * as posts_publicAuthor from "../posts/publicAuthor.js";
import type * as posts_publicAuthorSlug from "../posts/publicAuthorSlug.js";
import type * as posts_queries from "../posts/queries.js";
import type * as posts_translate from "../posts/translate.js";
import type * as providers_mutations from "../providers/mutations.js";
import type * as providers_queries from "../providers/queries.js";
import type * as providers_values from "../providers/values.js";
import type * as publicationModeration from "../publicationModeration.js";
import type * as publicationQuotas from "../publicationQuotas.js";
import type * as rateLimits from "../rateLimits.js";
import type * as reportValues from "../reportValues.js";
import type * as reports from "../reports.js";
import type * as sendEmails from "../sendEmails.js";
import type * as translations_security from "../translations/security.js";
import type * as translations_shared from "../translations/shared.js";
import type * as utils_errors from "../utils/errors.js";
import type * as utils_limits from "../utils/limits.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAudit: typeof adminAudit;
  adminAuditValues: typeof adminAuditValues;
  aggregates: typeof aggregates;
  "alerts/dispatch": typeof alerts_dispatch;
  "alerts/emails": typeof alerts_emails;
  "alerts/mutations": typeof alerts_mutations;
  "alerts/queries": typeof alerts_queries;
  "alerts/values": typeof alerts_values;
  "auth/admin": typeof auth_admin;
  "auth/auth": typeof auth_auth;
  "auth/users": typeof auth_users;
  "bookmarks/migrations": typeof bookmarks_migrations;
  "bookmarks/mutations": typeof bookmarks_mutations;
  "bookmarks/queries": typeof bookmarks_queries;
  cascadeDeletes: typeof cascadeDeletes;
  cascadeHelpers: typeof cascadeHelpers;
  "chat/mutations": typeof chat_mutations;
  "chat/queries": typeof chat_queries;
  "communities/actions": typeof communities_actions;
  "communities/mutations": typeof communities_mutations;
  "communities/queries": typeof communities_queries;
  crons: typeof crons;
  debug_aggregates: typeof debug_aggregates;
  email: typeof email;
  "emails/layout": typeof emails_layout;
  "emails/strings": typeof emails_strings;
  "emails/templates": typeof emails_templates;
  founders: typeof founders;
  functions: typeof functions;
  http: typeof http;
  "integrations/cloudinary": typeof integrations_cloudinary;
  "integrations/posthog": typeof integrations_posthog;
  "integrations/r2": typeof integrations_r2;
  "integrations/stripe": typeof integrations_stripe;
  "jobs/actions": typeof jobs_actions;
  "jobs/applicationCv": typeof jobs_applicationCv;
  "jobs/emailEvents": typeof jobs_emailEvents;
  "jobs/mutations": typeof jobs_mutations;
  "jobs/queries": typeof jobs_queries;
  "jobs/translate": typeof jobs_translate;
  "listings/imageUrls": typeof listings_imageUrls;
  "listings/mutations": typeof listings_mutations;
  "listings/privacy": typeof listings_privacy;
  "listings/queries": typeof listings_queries;
  "listings/translate": typeof listings_translate;
  "me/queries": typeof me_queries;
  "notifications/admin": typeof notifications_admin;
  "notifications/mutations": typeof notifications_mutations;
  "notifications/queries": typeof notifications_queries;
  "posts/actions": typeof posts_actions;
  "posts/comments/mutations": typeof posts_comments_mutations;
  "posts/likes/mutations": typeof posts_likes_mutations;
  "posts/mutations": typeof posts_mutations;
  "posts/publicAuthor": typeof posts_publicAuthor;
  "posts/publicAuthorSlug": typeof posts_publicAuthorSlug;
  "posts/queries": typeof posts_queries;
  "posts/translate": typeof posts_translate;
  "providers/mutations": typeof providers_mutations;
  "providers/queries": typeof providers_queries;
  "providers/values": typeof providers_values;
  publicationModeration: typeof publicationModeration;
  publicationQuotas: typeof publicationQuotas;
  rateLimits: typeof rateLimits;
  reportValues: typeof reportValues;
  reports: typeof reports;
  sendEmails: typeof sendEmails;
  "translations/security": typeof translations_security;
  "translations/shared": typeof translations_shared;
  "utils/errors": typeof utils_errors;
  "utils/limits": typeof utils_limits;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  posthog: import("@posthog/convex/_generated/component.js").ComponentApi<"posthog">;
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  cloudinary: import("@imaxis/cloudinary-convex/_generated/component.js").ComponentApi<"cloudinary">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
  convexCascadingDeletes: import("@sholajegede/convex-cascading-deletes/_generated/component.js").ComponentApi<"convexCascadingDeletes">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  aggregateByLikesPosts: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateByLikesPosts">;
  aggregateByLikesComments: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateByLikesComments">;
  aggregateByComments: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateByComments">;
  aggregateByCommunityPosts: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateByCommunityPosts">;
  aggregateByCommunityMembers: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateByCommunityMembers">;
  postShuffle: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"postShuffle">;
  postSortedByDate: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"postSortedByDate">;
  postSortedByLikes: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"postSortedByLikes">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
