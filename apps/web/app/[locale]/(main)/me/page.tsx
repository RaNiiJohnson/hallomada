import { redirect } from "@/i18n/navigation";
import { getAuthHref } from "@/lib/auth-return-to";
import { isAuthenticated } from "@/lib/auth-server";
import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { PersonalSpace, PersonalSpaceSkeleton } from "./personal-space";

export default async function MySpacePage() {
  if (!(await isAuthenticated())) {
    redirect({
      href: getAuthHref("/login", "/me"),
      locale: await getLocale(),
    });
  }

  return (
    <Suspense fallback={<PersonalSpaceSkeleton />}>
      <PersonalSpace />
    </Suspense>
  );
}
