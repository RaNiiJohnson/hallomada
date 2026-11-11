import { vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { authComponent } from "../auth/auth";

/** Resend events meaning the recruiter never got the application. */
const UNDELIVERED_EVENTS = new Set(["email.bounced", "email.failed"]);

/**
 * Called by the Resend component for every webhook event. When the email sent
 * to a recruiter bounces, the application is marked as failed, the job author
 * is told their contact address is broken, and the candidate gets an email.
 */
export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  returns: v.null(),
  handler: async (ctx, { id, event }) => {
    if (!UNDELIVERED_EVENTS.has(event.type)) return null;

    const application = await ctx.db
      .query("jobApplications")
      .withIndex("by_recruiterEmailId", (q) => q.eq("recruiterEmailId", id))
      .unique();
    // Not a recruiter email (auth, candidate…), or already handled.
    if (!application || application.emailStatus === "failed") return null;

    await ctx.db.patch(application._id, { emailStatus: "failed" });

    const job = await ctx.db.get(application.jobId);
    if (!job) return null;

    // One unread warning per job is enough, however many applications bounce.
    const targetHref = `/jobs/${job.slug}/edit`;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) =>
        q.eq("userId", job.authorId).eq("read", false),
      )
      .take(200);
    const alreadyWarned = unread.some(
      (n) => n.type === "job_contact_bounced" && n.targetHref === targetHref,
    );
    if (!alreadyWarned) {
      await ctx.db.insert("notifications", {
        userId: job.authorId,
        type: "job_contact_bounced",
        read: false,
        message: job.title,
        targetHref,
      });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.jobs.actions.sendApplicationBouncedEmail,
      { applicationId: application._id },
    );
    return null;
  },
});

export const getBouncedApplicationEmailData = internalQuery({
  args: { applicationId: v.id("jobApplications") },
  returns: v.union(
    v.object({
      candidateName: v.string(),
      candidateEmail: v.string(),
      candidateLocale: v.optional(
        v.union(v.literal("fr"), v.literal("en"), v.literal("de")),
      ),
      jobTitle: v.string(),
      jobSlug: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { applicationId }) => {
    const application = await ctx.db.get(applicationId);
    if (!application) return null;
    const job = await ctx.db.get(application.jobId);
    const candidate = await authComponent.getAnyUserById(
      ctx,
      application.candidateId,
    );
    if (!job || !candidate) return null;
    return {
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidateLocale: application.candidateLocale,
      jobTitle: job.title,
      jobSlug: job.slug,
    };
  },
});
