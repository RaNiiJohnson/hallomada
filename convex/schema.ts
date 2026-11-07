import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  adminAuditActionValidator,
  adminAuditMetadataValidator,
} from "./adminAuditValues";
import {
  providerCategoryValidator,
  providerServiceModeValidator,
  providerServiceValidator,
} from "./providers/values";
import { rentalDocumentCategoryValidator } from "./rentalFiles/values";
import {
  reportReasonValidator,
  reportStatusValidator,
  reportTargetIdValidator,
  reportTargetTypeValidator,
} from "./reportValues";

export default defineSchema({
  service_provider: defineTable({
    userId: v.string(),
    serviceType: v.string(),
    description: v.optional(v.string()),
    experience: v.optional(v.string()),
    tarif: v.optional(v.string()),
    available: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_availability", ["available"]),

  // Public showcase pages for Malagasy service providers based in Germany.
  // Contact details are deliberately public: reaching the provider is the
  // purpose of the page.
  providers: defineTable({
    slug: v.string(),
    name: v.string(),
    category: providerCategoryValidator,
    tagline: v.optional(v.string()),
    description: v.string(),
    city: v.string(),
    serviceModes: v.array(providerServiceModeValidator),
    services: v.array(providerServiceValidator),
    logo: v.optional(v.object({ storageId: v.string() })),
    images: v.array(v.object({ storageId: v.string() })),
    whatsapp: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    facebook: v.optional(v.string()),
    instagram: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("rejected"),
      v.literal("closed"),
      v.literal("archived"),
    ),
    authorId: v.string(),
    authorName: v.optional(v.string()),
    updatedAt: v.number(),
    searchAll: v.string(),
  })
    .index("by_authorId_and_status", ["authorId", "status"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_status_and_category", ["status", "category"])
    .searchIndex("search_all_fields", {
      searchField: "searchAll",
      filterFields: ["status", "category"],
    }),

  JobOffer: defineTable({
    title: v.string(),
    type: v.union(
      v.literal("auPair"),
      v.literal("training"),
      v.literal("voluntary"),
      v.literal("internship"),
      v.literal("miniJob"),
      v.literal("job"),
      v.literal("freelance"),
      v.literal("scholarship"),
    ),
    slug: v.string(),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    // Only "job" offers have a contract (CDI/CDD). The other legacy values stay
    // valid so older documents keep loading.
    contractType: v.optional(
      v.union(
        v.literal("CDI"),
        v.literal("CDD"),
        v.literal("FSJ/FOJ/BFD"),
        v.literal("fullTime"),
        v.literal("partTime"),
        v.literal("freelance"),
        v.literal("apprenticeship"),
      ),
    ),
    workTime: v.optional(v.union(v.literal("fullTime"), v.literal("partTime"))),
    city: v.string(),
    workMode: v.optional(
      v.union(v.literal("onSite"), v.literal("hybrid"), v.literal("remote")),
    ),
    remoteLocation: v.optional(v.string()),
    duration: v.optional(v.string()),
    startDate: v.optional(v.string()),
    applicationDeadline: v.optional(v.string()),
    company: v.string(),
    description: v.string(),
    certificates: v.optional(v.array(v.string())),
    salary: v.optional(v.number()),
    salaryPeriod: v.optional(v.union(
      v.literal("hour"),
      v.literal("month"),
      v.literal("year"),
    )),
    sector: v.optional(v.string()),
    benefits: v.optional(v.string()),
    externalApplicationUrl: v.optional(v.string()),
    weeklyHours: v.optional(v.number()),
    trainingRequirements: v.optional(v.string()),
    authorId: v.string(),
    authorName: v.optional(v.string()),
    // Deprecated (alerts and "En vedette" were removed). Kept optional only so
    // rows written while they existed still validate; safe to drop once cleared.
    alertsSentAt: v.optional(v.number()),
    featuredUntil: v.optional(v.number()),
    // Set the first time moderation approves it (later re-approvals after an
    // edit keep their place in the list).
    approvedAt: v.optional(v.number()),
    // Position in the default (newest first) list: set on first approval and
    // moved to "now" by a bump. Older rows are backfilled (see convex/bump.ts).
    listedAt: v.optional(v.number()),
    bumpedAt: v.optional(v.number()),
    // Optional during the rollout so existing offers remain visible as active.
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("rejected"),
        v.literal("closed"),
        v.literal("archived"),
      ),
    ),
    updatedAt: v.number(),
    searchAll: v.optional(v.string()),
  })
    .index("by_authorId", ["authorId"])
    .index("by_status", ["status"])
    .index("by_city", ["city"])
    .index("by_type", ["type"])
    .index("by_contract", ["contractType"])
    .index("by_listedAt", ["listedAt"])
    .index("by_type_and_listedAt", ["type", "listedAt"])
    .index("by_contract_and_listedAt", ["contractType", "listedAt"])
    .index("by_salary", ["salary"])
    .index("by_slug", ["slug"])
    .searchIndex("search_all_fields", {
      searchField: "searchAll",
      filterFields: ["city", "type", "contractType"],
    }),

  RealestateListing: defineTable({
    title: v.string(),
    propertyType: v.union(
      v.literal("room"),
      v.literal("apartment"),
      v.literal("house"),
      v.literal("studio"),
      v.literal("shared"),
    ),
    listingMode: v.union(v.literal("rent"), v.literal("sale")),
    // Optional to keep existing listings readable during the safe rollout.
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("rejected"),
        v.literal("closed"),
        v.literal("archived"),
      ),
    ),
    slug: v.string(),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    city: v.string(),
    neighborhood: v.optional(v.string()),

    price: v.number(),
    charges: v.optional(v.number()),
    deposit: v.optional(v.number()),
    currency: v.literal("EUR"),
    period: v.optional(v.literal("month")),

    area: v.number(),
    bedrooms: v.number(),
    bathrooms: v.number(),
    floor: v.number(),
    pets: v.boolean(),

    images: v.array(
      v.object({
        storageId: v.optional(v.string()),
        url: v.optional(v.string()),
        publicId: v.optional(v.string()),
        secureUrl: v.optional(v.string()),
      }),
    ),

    description: v.string(),
    extras: v.array(v.string()),

    availableFrom: v.optional(v.number()),

    authorId: v.string(),
    authorName: v.optional(v.string()),
    // Deprecated (alerts and "En vedette" were removed). Kept optional only so
    // rows written while they existed still validate; safe to drop once cleared.
    alertsSentAt: v.optional(v.number()),
    featuredUntil: v.optional(v.number()),
    // Set the first time moderation approves it (later re-approvals after an
    // edit keep their place in the list).
    approvedAt: v.optional(v.number()),
    // Rentals only: the owner asks candidates for a rental dossier (true) or
    // only wants to be contacted (false). Missing on older listings = contact.
    acceptsRentalFile: v.optional(v.boolean()),
    // Position in the default (newest first) list: set on first approval and
    // moved to "now" by a bump. Older rows are backfilled (see convex/bump.ts).
    listedAt: v.optional(v.number()),
    bumpedAt: v.optional(v.number()),
    updatedAt: v.number(),
    searchAll: v.optional(v.string()),
  })
    .index("by_authorId", ["authorId"])
    .index("by_status", ["status"])
    .index("by_city", ["city"])
    .index("by_propertyType", ["propertyType"])
    .index("by_listedAt", ["listedAt"])
    .index("by_propertyType_and_listedAt", ["propertyType", "listedAt"])
    .index("by_listingMode", ["listingMode"])
    .index("by_price", ["price"])
    .index("by_bedrooms", ["bedrooms"])
    .index("by_slug", ["slug"])
    .searchIndex("search_all_fields", {
      searchField: "searchAll",
      filterFields: [
        "city",
        "propertyType",
        "listingMode",
        "bedrooms",
        "price",
      ],
    }),

  JobContactInfo: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    jobId: v.id("JobOffer"),
  }).index("by_jobId", ["jobId"]),

  RealestateContactInfo: defineTable({
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    listingId: v.id("RealestateListing"),
    listing: v.string(),
  }).index("by_listingId", ["listingId"]),

  bookmarks: defineTable({
    userId: v.string(),
    resourceId: v.union(
      v.id("JobOffer"),
      v.id("RealestateListing"),
      v.id("posts"),
    ),
    resourceType: v.union(
      v.literal("job"),
      v.literal("realEstate"),
      v.literal("post"),
    ),
    // A small, public-safe projection lets the private favorites page render
    // a page of saved resources without issuing one document read per item.
    // It is optional while bookmarks created before PR 4 remain in place.
    snapshot: v.optional(
      v.object({
        title: v.string(),
        href: v.string(),
        subtitle: v.optional(v.string()),
      }),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_resourceType_and_resourceId", [
      "userId",
      "resourceType",
      "resourceId",
    ])
    .index("by_resourceId", ["resourceId"]),

  communities: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    authorId: v.string(),
    authorName: v.optional(v.string()),
    privacy: v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("secret"),
    ),
    // A community is anchored to a city or a theme; `rules` holds a short,
    // plain-text list of house rules shown on the community page.
    kind: v.optional(v.union(v.literal("city"), v.literal("theme"))),
    city: v.optional(v.string()),
    theme: v.optional(v.string()),
    rules: v.optional(v.string()),
    searchAll: v.optional(v.string()),
    membersCount: v.optional(v.number()),
    postsCount: v.optional(v.number()),
  })
    .index("by_authorId", ["authorId"])
    .index("by_slug", ["slug"])
    .index("by_privacy", ["privacy"])
    .searchIndex("search_all_fields", { searchField: "searchAll" }),

  communityMembers: defineTable({
    userId: v.string(),
    communityId: v.id("communities"),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("moderator"),
    ),
    lastReadAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_communityId", ["communityId"])
    .index("by_userId_and_communityId", ["userId", "communityId"]),

  // Posts

  posts: defineTable({
    slug: v.string(),
    title: v.string(),
    // Public posts deliberately have no community. `scope` remains optional
    // during the migration so every existing post is still valid.
    scope: v.optional(v.union(v.literal("public"), v.literal("community"))),
    communityId: v.optional(v.id("communities")),
    communityName: v.optional(v.string()),
    communitySlug: v.optional(v.string()),
    content: v.string(),
    authorId: v.string(),
    authorName: v.optional(v.string()),
    searchAll: v.optional(v.string()),
    likesCount: v.optional(v.number()),
    commentsCount: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_authorId", ["authorId"])
    .index("by_slug", ["slug"])
    .index("by_communityId", ["communityId"])
    .searchIndex("search_all_fields", { searchField: "searchAll" }),

  postLikes: defineTable({
    userId: v.string(),
    postId: v.id("posts"),
  })
    .index("by_userId", ["userId"])
    .index("by_postId", ["postId"])
    .index("by_postId_and_userId", ["postId", "userId"]),

  postComments: defineTable({
    authorId: v.string(),
    authorName: v.string(),
    postId: v.id("posts"),
    content: v.string(),
  })
    .index("by_authorId", ["authorId"])
    .index("by_postId", ["postId"]),

  postCommentLikes: defineTable({
    userId: v.string(),
    commentId: v.id("postComments"),
  })
    .index("by_userId", ["userId"])
    .index("by_commentId", ["commentId"])
    .index("by_commentId_and_userId", ["commentId", "userId"]),

  postCommentReplies: defineTable({
    authorId: v.string(),
    authorName: v.string(),
    commentId: v.id("postComments"),
    content: v.string(),
  })
    .index("by_authorId", ["authorId"])
    .index("by_commentId", ["commentId"]),

  postCommentReplyLikes: defineTable({
    userId: v.string(),
    replyId: v.id("postCommentReplies"),
  })
    .index("by_userId", ["userId"])
    .index("by_replyId", ["replyId"])
    .index("by_replyId_and_userId", ["replyId", "userId"]),

  // Translations

  jobTranslations: defineTable({
    jobId: v.id("JobOffer"),
    language: v.union(v.literal("fr"), v.literal("en"), v.literal("de")),
    title: v.string(),
    city: v.string(),
    description: v.string(),
    sourceUpdatedAt: v.number(),
  })
    .index("by_job_language", ["jobId", "language"])
    .index("by_job", ["jobId"]),

  listingTranslations: defineTable({
    listingId: v.id("RealestateListing"),
    language: v.union(v.literal("fr"), v.literal("en"), v.literal("de")),
    title: v.string(),
    description: v.string(),
    city: v.string(),
    sourceUpdatedAt: v.number(),
  })
    .index("by_listing_language", ["listingId", "language"])
    .index("by_listing", ["listingId"]),

  postTranslations: defineTable({
    postId: v.id("posts"),
    language: v.union(v.literal("fr"), v.literal("en"), v.literal("de")),
    title: v.string(),
    content: v.string(),
    sourceUpdatedAt: v.number(),
  })
    .index("by_post_language", ["postId", "language"])
    .index("by_post", ["postId"]),

  communityMessages: defineTable({
    communityId: v.id("communities"),
    authorId: v.string(),
    authorName: v.optional(v.string()),
    content: v.string(),
    editedAt: v.optional(v.number()),
  }).index("by_communityId", ["communityId"]),

  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("new_comment"),
      v.literal("new_reply"),
      v.literal("new_like"),
      v.literal("new_comment_like"),
      v.literal("new_reply_like"),
      v.literal("new_member"),
      v.literal("leave_community"),
      v.literal("job_approved"),
      v.literal("job_rejected"),
      v.literal("listing_approved"),
      v.literal("listing_rejected"),
      v.literal("job_pending_review"),
      v.literal("listing_pending_review"),
      v.literal("provider_approved"),
      v.literal("provider_rejected"),
      v.literal("provider_pending_review"),
      v.literal("job_contact_bounced"),
      v.literal("rental_file_received"),
    ),
    read: v.boolean(),
    postSlug: v.optional(v.string()),
    communitySlug: v.optional(v.string()),
    fromUserName: v.optional(v.string()),
    message: v.optional(v.string()),
    targetHref: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"])
    .index("by_communitySlug", ["communitySlug"])
    .index("by_postSlug", ["postSlug"]),

  uploadGrants: defineTable({
    key: v.string(),
    userId: v.string(),
    kind: v.union(
      v.literal("cv"),
      v.literal("listing"),
      v.literal("profile"),
      v.literal("cover"),
      v.literal("applicationCv"),
      v.literal("provider"),
      v.literal("rentalDocument"),
    ),
    expectedContentType: v.string(),
    maxSize: v.number(),
    verified: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_userId", ["userId"]),

  jobApplications: defineTable({
    jobId: v.id("JobOffer"),
    candidateId: v.string(),
    // Snapshot for the job author's list; older applications don't have it.
    candidateName: v.optional(v.string()),
    cvKey: v.string(),
    // Unguessable token embedded in the recruiter's e-mail. The /application-cv
    // route trades it for a short-lived signed R2 URL, so the link keeps working
    // until `cvExpiresAt` instead of dying with the signed URL after 15 minutes.
    cvToken: v.optional(v.string()),
    cvExpiresAt: v.optional(v.number()),
    // Set once the retention window has passed and the CV is no longer reachable.
    cvPurgedAt: v.optional(v.number()),
    coverLetter: v.optional(v.string()),
    appliedAt: v.number(),
    // Premium candidates are highlighted to the recruiter (email and list).
    highlighted: v.optional(v.boolean()),
    // Optional during the safe rollout: legacy applications predate email
    // delivery tracking and remain readable until they are backfilled.
    emailStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("sent"),
        v.literal("failed"),
      ),
    ),
    // Resend id of the email sent to the recruiter. The Resend webhook uses it
    // to find the application when that email bounces.
    recruiterEmailId: v.optional(v.string()),
    // Language of the page the candidate applied from, for follow-up emails.
    candidateLocale: v.optional(
      v.union(v.literal("fr"), v.literal("en"), v.literal("de")),
    ),
  })
    .index("by_jobId_and_candidateId", ["jobId", "candidateId"])
    .index("by_recruiterEmailId", ["recruiterEmailId"])
    .index("by_candidateId", ["candidateId"])
    .index("by_cvKey", ["cvKey"])
    .index("by_cvToken", ["cvToken"])
    .index("by_cvExpiresAt", ["cvExpiresAt"]),

  reports: defineTable({
    reporterId: v.string(),
    reporterName: v.optional(v.string()),
    targetType: reportTargetTypeValidator,
    targetId: reportTargetIdValidator,
    targetLabel: v.string(),
    targetHref: v.string(),
    reason: reportReasonValidator,
    details: v.optional(v.string()),
    status: reportStatusValidator,
    reportedAt: v.number(),
    handledAt: v.optional(v.number()),
    handledById: v.optional(v.string()),
    handledByName: v.optional(v.string()),
  })
    .index("by_reporterId_and_targetType_and_targetId", [
      "reporterId",
      "targetType",
      "targetId",
    ])
    .index("by_status_and_reportedAt", ["status", "reportedAt"])
    .index("by_reportedAt", ["reportedAt"]),

  // A member's rental dossier ("Mieterselbstauskunft" + documents). One row
  // per member; documents live in `rentalDocuments`.
  rentalFiles: defineTable({
    userId: v.string(),
    occupation: v.optional(v.string()),
    employer: v.optional(v.string()),
    netMonthlyIncome: v.optional(v.number()),
    householdSize: v.optional(v.number()),
    moveInDate: v.optional(v.string()),
    pets: v.optional(v.boolean()),
    smoker: v.optional(v.boolean()),
    about: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Private files stored in R2. Never public: landlords open them through a
  // time-limited, revocable link (`rentalApplications.token`).
  rentalDocuments: defineTable({
    userId: v.string(),
    category: rentalDocumentCategoryValidator,
    key: v.string(),
    fileName: v.string(),
    contentType: v.string(),
    uploadedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // A dossier sent to a listing. The landlord sees the candidate's dossier as
  // it is now (so deleted documents disappear) until `expiresAt` or until the
  // candidate revokes access.
  rentalApplications: defineTable({
    listingId: v.id("RealestateListing"),
    candidateId: v.string(),
    candidateName: v.string(),
    message: v.optional(v.string()),
    highlighted: v.boolean(),
    token: v.string(),
    sentAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_listingId_and_candidateId", ["listingId", "candidateId"])
    .index("by_candidateId", ["candidateId"])
    .index("by_token", ["token"])
    .index("by_expiresAt", ["expiresAt"]),

  // Daily view counters for listings and job offers ("listing:<id>" or
  // "job:<id>"), kept apart from the publications so a view never
  // invalidates the lists that show them.
  publicationViews: defineTable({
    resourceKey: v.string(),
    day: v.string(),
    views: v.number(),
  }).index("by_resourceKey_and_day", ["resourceKey", "day"]),

  // "Founding member" badge holders, one row per user (see convex/founders.ts
  // for the rules: first 100 approved publishers, plus manual grants).
  founders: defineTable({
    userId: v.string(),
    since: v.number(),
    // "Fondateur n° 23". Optional for rows created before numbering;
    // `founders:rebuildFounders` assigns them.
    number: v.optional(v.number()),
    source: v.optional(v.union(v.literal("auto"), v.literal("manual"))),
    grantedBy: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_number", ["number"]),

  // Singleton row edited from the admin dashboard. Absent or `closesAt: null`
  // means the founder program is still open.
  founderProgram: defineTable({
    closesAt: v.union(v.number(), v.null()),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }),

  // One row per plan ("free" / "premium"), edited from the admin dashboard;
  // a missing row means the defaults in publicationQuotaValues.ts.
  planQuotas: defineTable({
    plan: v.union(v.literal("free"), v.literal("premium")),
    jobsPerWeek: v.number(),
    listingsPerWeek: v.number(),
    providersPerMonth: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_plan", ["plan"]),

  adminAuditEvents: defineTable({
    administratorId: v.string(),
    administratorLabel: v.optional(v.string()),
    action: adminAuditActionValidator,
    targetType: v.literal("user"),
    targetId: v.string(),
    targetLabel: v.optional(v.string()),
    occurredAt: v.number(),
    metadata: v.optional(adminAuditMetadataValidator),
  }).index("by_occurredAt", ["occurredAt"]),
});
