import { createElement, type ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const {
  Link: IntlLink,
  redirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);

// next-intl forwards unknown props to next/link at runtime, but its typings
// omit this (newer) next/link prop.
type LinkProps = ComponentProps<typeof IntlLink> & {
  unstable_dynamicOnHover?: boolean;
};

/**
 * Localized Link that fully prefetches the target route on hover/touch.
 *
 * Without a `loading.tsx`, dynamic routes are not prefetched by default, so a
 * click waits for a server round-trip before anything changes on screen.
 * Upgrading to a full prefetch on hover means the route payload is usually
 * already in the client cache when the click lands, so the page (and its own
 * Suspense/skeleton) shows immediately. Can be opted out per link with
 * `unstable_dynamicOnHover={false}`.
 */
function Link(props: LinkProps) {
  return createElement(IntlLink, {
    unstable_dynamicOnHover: true,
    ...props,
  } as ComponentProps<typeof IntlLink>);
}

export { Link, redirect, usePathname, useRouter, getPathname };
