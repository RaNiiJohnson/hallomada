export type PublicationStatus =
  | "pending"
  | "active"
  | "rejected"
  | "closed"
  | "archived";

export function isAllowedPublicationTransition(
  currentStatus: PublicationStatus | undefined,
  nextStatus: PublicationStatus,
) {
  const current = currentStatus ?? "active";
  return (
    (current === "active" && nextStatus === "closed") ||
    (current === "closed" &&
      (nextStatus === "active" || nextStatus === "archived")) ||
    (current === "archived" && nextStatus === "pending") ||
    ((current === "pending" || current === "rejected") &&
      nextStatus === "archived")
  );
}

export function isPublicPublicationStatus(
  status: PublicationStatus | undefined,
) {
  return status === undefined || status === "active";
}

export function requiresPublicationModeration(
  status: PublicationStatus | undefined,
) {
  return status === "pending" || status === "rejected";
}
