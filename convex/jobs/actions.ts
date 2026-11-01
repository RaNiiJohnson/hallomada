import { v } from "convex/values";
import { render } from "react-email";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { authAction } from "../functions";
import { env } from "../_generated/server";
import { resend } from "../sendEmails";
import { throwNotFound } from "../utils/errors";
import NewApplicationEmail from "./CvTemplate";

type ApplicationEmailPayload = {
  applicationId: Id<"jobApplications">;
  jobTitle: string;
  authorId: string;
  contactEmail?: string;
  cvToken: string;
  coverLetter?: string;
};

async function deliverApplicationEmail(
  ctx: ActionCtx,
  user: { name: string; email: string },
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

    const html = await render(
      NewApplicationEmail({
        candidateName: user.name,
        candidateEmail: user.email,
        jobTitle: application.jobTitle,
        coverLetter: application.coverLetter,
        cvUrl,
      }),
    );

    await resend.sendEmail(ctx, {
      from: "Hallomada <noreply@hallomada.de>",
      to: contactEmail,
      subject: `Neue Bewerbung für: ${application.jobTitle}`,
      html,
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

export const applyToJob = authAction({
  args: {
    jobId: v.id("JobOffer"),
    applicationCvKey: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = ctx.user;

    // const distinctId = posthogDistinctId(user._id);

    try {
      const application = await ctx.runMutation(
        internal.jobs.mutations.submitApplication,
        args,
      );

      await deliverApplicationEmail(ctx, user, application);

      return null;

      // await posthog.capture(ctx, {
      //   distinctId,
      //   event: "job_application_submitted",
      //   properties: {
      //     job_id: args.jobId,
      //     job_title: job.title,
      //   },
      // });
    } catch (error) {
      // await posthog.captureException(ctx, {
      //   error,
      //   distinctId,
      //   additionalProperties: { job_id: args.jobId },
      // });
      throw error;
    }
  },
});

export const retryApplicationEmail = authAction({
  args: { jobId: v.id("JobOffer") },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const application = await ctx.runMutation(
      internal.jobs.mutations.prepareApplicationEmailRetry,
      { jobId },
    );
    await deliverApplicationEmail(ctx, ctx.user, application);
    return null;
  },
});
