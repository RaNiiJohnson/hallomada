import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { authAction } from "../functions";
import { env } from "../_generated/server";
import { sendTemplateEmail } from "../email";
import { SITE_URL } from "../emails/layout";
import {
  applicationFailedStrings,
  applicationSentStrings,
  toEmailLocale,
  type EmailLocale,
} from "../emails/strings";
import {
  ApplicationFailedEmail,
  ApplicationSentEmail,
  NewApplicationEmail,
} from "../emails/templates";
import { throwNotFound } from "../utils/errors";

type ApplicationEmailPayload = {
  applicationId: Id<"jobApplications">;
  jobTitle: string;
  jobSlug: string;
  company: string;
  authorId: string;
  contactEmail?: string;
  cvToken: string;
  coverLetter?: string;
};

type Candidate = { name: string; email: string };

const vLocale = v.optional(
  v.union(v.literal("fr"), v.literal("en"), v.literal("de")),
);

async function deliverApplicationEmail(
  ctx: ActionCtx,
  user: Candidate,
  application: ApplicationEmailPayload,
) {
  try {
    let contactEmail = application.contactEmail;
    if (!contactEmail) {
      contactEmail =
        (await ctx.runQuery(internal.auth.users.getContactEmailById, {
          id: application.authorId,
        })) ?? undefined;
    }
    if (!contactEmail) {
      throwNotFound("No contact email found for this job.");
    }

    // Stable link: it redirects to a freshly signed URL on every click, so it
    // keeps working long after the 15-minute signed URL would have expired.
    const cvUrl = `${env.CONVEX_SITE_URL}/application-cv?t=${application.cvToken}`;

    await sendTemplateEmail(ctx, {
      to: contactEmail,
      subject: `Neue Bewerbung: ${application.jobTitle}`,
      // Lets the recruiter answer the candidate by simply hitting "reply".
      replyTo: [user.email],
      email: (
        <NewApplicationEmail
          candidateName={user.name}
          candidateEmail={user.email}
          jobTitle={application.jobTitle}
          coverLetter={application.coverLetter}
          cvUrl={cvUrl}
        />
      ),
    });
    await ctx.runMutation(internal.jobs.mutations.updateApplicationEmailStatus, {
      id: application.applicationId,
      emailStatus: "sent",
    });
  } catch (error) {
    await ctx.runMutation(internal.jobs.mutations.updateApplicationEmailStatus, {
      id: application.applicationId,
      emailStatus: "failed",
    });
    throw error;
  }
}

/**
 * Tells the candidate whether their application went out. Best effort: a
 * problem here must never change the outcome of the application itself.
 */
async function notifyCandidate(
  ctx: ActionCtx,
  user: Candidate,
  application: ApplicationEmailPayload,
  locale: EmailLocale,
  outcome: "sent" | "failed",
) {
  const jobUrl = `${SITE_URL}/${locale}/jobs/${application.jobSlug}`;
  const props = {
    locale,
    name: user.name,
    jobTitle: application.jobTitle,
    jobUrl,
  };
  try {
    await sendTemplateEmail(
      ctx,
      outcome === "sent"
        ? {
            to: user.email,
            subject: applicationSentStrings[locale].subject(application.jobTitle),
            email: (
              <ApplicationSentEmail {...props} company={application.company} />
            ),
          }
        : {
            to: user.email,
            subject: applicationFailedStrings[locale].subject(
              application.jobTitle,
            ),
            email: <ApplicationFailedEmail {...props} />,
          },
    );
  } catch (error) {
    console.error("Failed to send candidate application email", error);
  }
}

export const applyToJob = authAction({
  args: {
    jobId: v.id("JobOffer"),
    applicationCvKey: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
    locale: vLocale,
  },
  returns: v.null(),
  handler: async (ctx, { locale, ...args }) => {
    const user = ctx.user;
    const emailLocale = toEmailLocale(locale);

    // Validation errors (limits, closed job…) surface in the UI; no email.
    const application = await ctx.runMutation(
      internal.jobs.mutations.submitApplication,
      args,
    );

    try {
      await deliverApplicationEmail(ctx, user, application);
    } catch (error) {
      await notifyCandidate(ctx, user, application, emailLocale, "failed");
      throw error;
    }
    await notifyCandidate(ctx, user, application, emailLocale, "sent");
    return null;
  },
});

export const retryApplicationEmail = authAction({
  args: { jobId: v.id("JobOffer"), locale: vLocale },
  returns: v.null(),
  handler: async (ctx, { jobId, locale }) => {
    const application = await ctx.runMutation(
      internal.jobs.mutations.prepareApplicationEmailRetry,
      { jobId },
    );
    // The candidate is on the page and sees a failed retry right away, so
    // only the success is confirmed by email.
    await deliverApplicationEmail(ctx, ctx.user, application);
    await notifyCandidate(ctx, ctx.user, application, toEmailLocale(locale), "sent");
    return null;
  },
});
