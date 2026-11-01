import { R2 } from "@convex-dev/r2";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { admin } from "better-auth/plugins";
import { generatedSlug } from "../../src/lib/utils";
import { components } from "../_generated/api";
import { DataModel } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import authConfig from "../auth.config";
import authSchema from "../betterAuth/schema";
import { sendEmailVerification, sendResetPasswordEmail } from "../email";
import { throwForbidden, throwUnauthorized } from "../utils/errors";

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
      },
    },

    // advanced: {
    //   crossSubDomainCookies: {
    //     enabled: true,
    //     domain: ".hallomada.de",
    //   },
    // },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail(requireActionCtx(ctx), {
          to: user.email,
          url,
          name: user.name,
        });
      },
      onPasswordReset: async ({ user }) => {
        console.log(`Mot de passe réinitialisé pour ${user.email}`);
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmailVerification(requireActionCtx(ctx), {
          to: user.email,
          url,
          name: user.name,
        });
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            return {
              data: {
                ...user,
                slug: generatedSlug(user.name),
                isPublic: true,
                showEmail: false,
                showPhone: false,
              },
            };
          },
          after: async () => {
            // if (!("scheduler" in ctx)) return;
            // const distinctId = posthogDistinctId(user.id);
            // await posthog.identify(ctx, {
            //   distinctId,
            //   properties: {
            //     email: user.email,
            //     name: user.name,
            //   },
            // });
            // await posthog.capture(ctx, {
            //   distinctId,
            //   event: "user_signed_up",
            //   properties: { email: user.email },
            // });
          },
        },
      },
    },
    user: {
      additionalFields: {
        // === INFORMATIONS DE BASE ===
        coverImage: {
          type: "string",
          required: false,
        },
        slug: {
          type: "string",
          required: false,
        },

        // === PROFIL PROFESSIONNEL ===
        headline: {
          type: "string",
          required: false,
          // Titre professionnel affiché sous le nom (ex: "Développeur Full-Stack chez Google | Expert React")
        },
        bio: {
          type: "string",
          required: false,
          // Description longue du profil, résumé professionnel (500-2000 caractères)
        },

        // === LOCALISATION ===
        city: {
          type: "string",
          required: false,
        },
        country: {
          type: "string",
          required: false,
        },

        // === DOMAINE PROFESSIONNEL ===
        industry: {
          type: "string",
          required: false,
          // Secteur d'activité (ex: "Technologies de l'information", "Finance", "Santé")
        },
        roles: {
          type: "string[]",
          required: false,
        },
        company: {
          type: "string",
          required: false,
        },
        field: {
          type: "string",
          required: false,
          // Domaine de spécialisation (ex: "Développement Web", "Data Science")
        },
        skills: {
          type: "string[]",
          required: false,
          // Compétences techniques et soft skills (ex: ["React", "TypeScript", "Leadership"])
        },

        // === EXPÉRIENCE ET PARCOURS ===
        experienceYears: {
          type: "number",
          required: false,
          // Années d'expérience totales dans le domaine (ex: 5)
        },
        arrivalDate: {
          type: "number",
          required: false,
          // Date d'arrivée dans l'entreprise actuelle (timestamp en millisecondes)
        },
        journey: {
          type: "string[]",
          required: false,
          // Parcours rapide ou étapes clés (ex: ["Startup", "Scale-up", "Big Tech"])
        },

        // === PRÉFÉRENCES ET STATUT ===
        status: {
          type: "string",
          required: false,
          // Statut du profil (ex: "active", "inactive", "looking_for_job", "on_sabbatical")
        },
        isServiceProvider: {
          type: "boolean",
          required: false,
        },

        // === VISIBILITÉ ET CONFIDENTIALITÉ ===
        isPublic: {
          type: "boolean",
          required: false,
          // true si le profil est visible publiquement (sans connexion)
        },
        showEmail: {
          type: "boolean",
          required: false,
          // true si l'email est visible sur le profil public
        },
        showPhone: {
          type: "boolean",
          required: false,
          // true si le téléphone est visible sur le profil public
        },

        // === DONNÉES SYSTÈME ===
        lastActiveAt: {
          type: "number",
          required: false,
          // Date de dernière activité (connexion, post, like) - timestamp en millisecondes
        },
        cv: {
          type: "string",
          required: false,
          // fichier CV stocké sur Cloudflare R2
        },
        userType: {
          type: "string",
          required: false,
          // chercheur fournisseur
        },
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
      admin({
        adminRoles: ["admin"],
      }),
    ],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};

type AuthCtx = QueryCtx | MutationCtx | ActionCtx;

// Same client as integrations/r2.ts, which cannot be imported here (it imports
// this module). Only used to turn stored R2 keys into signed URLs.
const r2Urls = new R2(components.r2);

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) return null;

    // Uploaded avatars are stored as R2 keys, which are not loadable URLs.
    if (user.image?.startsWith("profile/")) {
      return { ...user, image: await r2Urls.getUrl(user.image) };
    }
    return user;
  },
});

export function assertEmailVerified(user: { emailVerified?: boolean }) {
  if (!user.emailVerified) {
    throwForbidden("Email verification required");
  }
}

export async function requireAuth(ctx: AuthCtx) {
  // `safeGetAuthUser` resolves the actual Convex `user` document.  That is the
  // shape used throughout this app (`_id`, custom profile fields, etc.), unlike
  // Better Auth's session payload whose identifier is `id`.
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throwUnauthorized();
  }

  // Phase 17 B2: block banned users at the function layer, not just the client.
  if (
    user.banned === true &&
    (!user.banExpires || user.banExpires > Date.now())
  ) {
    throwForbidden("Account banned");
  }

  assertEmailVerified(user);

  return { user };
}

export async function requireAdmin(ctx: AuthCtx) {
  const result = await requireAuth(ctx);
  if (result.user.role !== "admin") {
    throwForbidden("Admin access required");
  }
  return result;
}
