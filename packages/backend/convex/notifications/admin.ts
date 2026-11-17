import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

type PendingPublicationNotification = {
  resourceType: "job" | "listing" | "provider";
  title: string;
  authorName?: string;
};

export async function notifyAdministratorsOfPendingPublication(
  ctx: MutationCtx,
  publication: PendingPublicationNotification,
) {
  const administratorIds: string[] = await ctx.runQuery(
    components.betterAuth.users.getAdministratorIds,
    {},
  );

  await Promise.all(
    administratorIds.map((administratorId) =>
      ctx.db.insert("notifications", {
        userId: administratorId,
        type: `${publication.resourceType}_pending_review` as const,
        read: false,
        ...(publication.authorName
          ? { fromUserName: publication.authorName }
          : {}),
        message: publication.title,
        targetHref: "/admin/moderation",
      }),
    ),
  );
}
