import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";
import { sendTemplateEmail } from "../email";
import { SITE_URL } from "../emails/layout";
import { searchAlertStrings } from "../emails/strings";
import { SearchAlertEmail } from "../emails/templates";
import { alertLocaleValidator } from "./values";

/** Recipient of an alert email, or null if the alert was removed or muted. */
export const getRecipient = internalQuery({
  args: { alertId: v.id("alerts"), userId: v.string() },
  returns: v.union(v.object({ email: v.string(), name: v.string() }), v.null()),
  handler: async (ctx, { alertId, userId }) => {
    const alert = await ctx.db.get(alertId);
    if (!alert || alert.paused || !alert.email || alert.userId !== userId) {
      return null;
    }
    const email: string | null = await ctx.runQuery(
      components.betterAuth.users.getContactEmailById,
      { id: userId },
    );
    if (!email) return null;
    const user = await ctx.runQuery(components.betterAuth.users.getUserById, {
      id: userId,
      viewerId: userId,
    });
    return { email, name: user?.name ?? email };
  },
});

export const sendAlertEmail = internalAction({
  args: {
    userId: v.string(),
    alertId: v.id("alerts"),
    locale: alertLocaleValidator,
    kind: v.union(v.literal("listing"), v.literal("job")),
    title: v.string(),
    city: v.string(),
    path: v.string(),
    price: v.optional(v.number()),
    company: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recipient = await ctx.runQuery(internal.alerts.emails.getRecipient, {
      alertId: args.alertId,
      userId: args.userId,
    });
    if (!recipient) return null;

    const details = [
      args.company,
      args.city,
      args.price !== undefined
        ? new Intl.NumberFormat(args.locale, {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(args.price)
        : undefined,
    ]
      .filter(Boolean)
      .join(" · ");

    await sendTemplateEmail(ctx, {
      to: recipient.email,
      subject: searchAlertStrings[args.locale].subject(args.kind, args.title),
      email: (
        <SearchAlertEmail
          locale={args.locale}
          name={recipient.name}
          kind={args.kind}
          title={args.title}
          details={details}
          url={`${SITE_URL}/${args.locale}${args.path}`}
          manageUrl={`${SITE_URL}/${args.locale}/me?tab=alerts`}
        />
      ),
    });
    return null;
  },
});
