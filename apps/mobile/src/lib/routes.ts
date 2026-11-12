import type { Href } from 'expo-router';

import { openWeb } from './web';

/**
 * Maps a web path stored by the backend (bookmark snapshots, notification
 * targets) to the matching app screen. Paths the app has no screen for yet
 * return null and are opened on the website instead.
 */
export function appHrefFromWebPath(path: string): Href | null {
  const [pathname] = path.split(/[?#]/);
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [section, first, second] = parts;

  if (section === 'jobs' && first && parts.length === 2) {
    return { pathname: '/jobs/[slug]', params: { slug: first } };
  }
  if (section === 'listing' && first && parts.length === 2) {
    return { pathname: '/listings/[slug]', params: { slug: first } };
  }
  if (section === 'communities' && first && first !== 'explore') {
    return second
      ? { pathname: '/communities/[community]/[post]', params: { community: first, post: second } }
      : { pathname: '/communities/[community]', params: { community: first } };
  }
  if (section === 'communities' && !first) return '/communities';
  if (section === 'hl' && first) {
    return { pathname: '/profiles/[slug]', params: { slug: first } };
  }
  if (section === 'providers' && first) {
    return { pathname: '/providers/[slug]', params: { slug: first } };
  }
  if (section === 'providers') return '/providers';
  return null;
}

/** Navigates to the app screen for a web path, falling back to the website. */
export function openWebPath(router: { push: (href: Href) => void }, path: string) {
  const href = appHrefFromWebPath(path);
  if (href) router.push(href);
  else openWeb(path);
}
