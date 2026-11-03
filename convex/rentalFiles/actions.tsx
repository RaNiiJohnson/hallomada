import { v } from "convex/values";
import { internal } from "../_generated/api";
import { sendTemplateEmail } from "../email";
import { SITE_URL } from "../emails/layout";
import { RentalFileReceivedEmail } from "../emails/templates";
import { authAction } from "../functions";

/**
 * Sends the viewer's rental dossier to a listing: the author is notified in
 * Hallomada and, when an email is known, receives a private link by email.
 */
export const sendRentalFile = authAction({
  args: {
    listingId: v.id("RealestateListing"),
    message: v.optional(v.string()),
  },
  returns: v.object({ emailed: v.boolean() }),
  handler: async (ctx, args) => {
    const application = await ctx.runMutation(internal.rentalFiles.send.submit, args);

    const to =
      application.contactEmail ??
      (await ctx.runQuery(internal.auth.users.getContactEmailById, {
        id: application.authorId,
      }));
    if (!to) return { emailed: false };

    try {
      await sendTemplateEmail(ctx, {
        to,
        subject: application.highlighted
          ? `⭐ Hervorgehobene Mieterbewerbung: ${application.listingTitle}`
          : `Neue Mieterbewerbung: ${application.listingTitle}`,
        replyTo: [ctx.user.email],
        email: (
          <RentalFileReceivedEmail
            candidateName={application.candidateName}
            candidateEmail={ctx.user.email}
            listingTitle={application.listingTitle}
            message={application.message}
            dossierUrl={`${SITE_URL}/de/dossier/${application.token}`}
            highlighted={application.highlighted}
          />
        ),
      });
      return { emailed: true };
    } catch (error) {
      // The author still has the in-app notification and list.
      console.error("Failed to email the rental dossier", error);
      return { emailed: false };
    }
  },
});
