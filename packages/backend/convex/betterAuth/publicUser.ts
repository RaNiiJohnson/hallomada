import { v, type Infer } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export const publicUserValidator = v.object({
  _id: v.string(),
  name: v.string(),
  image: v.optional(v.union(v.null(), v.string())),
  coverImage: v.optional(v.union(v.null(), v.string())),
  slug: v.optional(v.union(v.null(), v.string())),
  headline: v.optional(v.union(v.null(), v.string())),
  bio: v.optional(v.union(v.null(), v.string())),
  city: v.optional(v.union(v.null(), v.string())),
  country: v.optional(v.union(v.null(), v.string())),
  industry: v.optional(v.union(v.null(), v.string())),
  roles: v.optional(v.union(v.null(), v.array(v.string()))),
  company: v.optional(v.union(v.null(), v.string())),
  field: v.optional(v.union(v.null(), v.string())),
  skills: v.optional(v.union(v.null(), v.array(v.string()))),
  experienceYears: v.optional(v.union(v.null(), v.number())),
  arrivalDate: v.optional(v.union(v.null(), v.number())),
  journey: v.optional(v.union(v.null(), v.array(v.string()))),
  status: v.optional(v.union(v.null(), v.string())),
  isServiceProvider: v.optional(v.union(v.null(), v.boolean())),
  isPublic: v.boolean(),
  showEmail: v.boolean(),
  email: v.optional(v.string()),
  userType: v.optional(v.union(v.null(), v.string())),
  hasCv: v.optional(v.boolean()),
});

export type PublicUser = Infer<typeof publicUserValidator>;

/**
 * The only projection allowed to cross the Better Auth component boundary.
 * System, moderation, session and R2 object-key fields are deliberately absent.
 */
export function projectPublicUser(
  user: Doc<"user">,
  options: { viewerId?: string | null } = {},
): PublicUser | null {
  const isOwner = options.viewerId === user._id;
  const isPublic = user.isPublic !== false;
  if (!isPublic && !isOwner) return null;

  // A public profile is intentionally a small identity card. Full biography,
  // professional details, email and CV state belong only to its owner.
  const canSeePrivateDetails = isOwner;

  return {
    _id: user._id,
    name: user.name,
    slug: user.slug,
    isPublic,
    showEmail: isOwner && user.showEmail === true,
    image: user.image,
    city: user.city,
    ...(canSeePrivateDetails
      ? {
          coverImage: user.coverImage,
          headline: user.headline,
          bio: user.bio,
          country: user.country,
          industry: user.industry,
          roles: user.roles,
          company: user.company,
          field: user.field,
          skills: user.skills,
          experienceYears: user.experienceYears,
          arrivalDate: user.arrivalDate,
          journey: user.journey,
          status: user.status,
          isServiceProvider: user.isServiceProvider,
          userType: user.userType,
        }
      : {}),
    ...(isOwner ? { email: user.email } : {}),
    ...(isOwner ? { hasCv: Boolean(user.cv) } : {}),
  };
}
