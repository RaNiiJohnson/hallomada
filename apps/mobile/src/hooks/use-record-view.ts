import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useEffect, useRef } from 'react';

/**
 * Random id that lets the server count an anonymous visitor's views once per
 * app launch. Nothing is stored on the device, matching the web without
 * audience-measurement consent. Signed-in members are deduplicated on the
 * server by their account.
 */
const visitorId = Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('');

type Resource = { type: 'listing'; id: Id<'RealestateListing'> } | { type: 'job'; id: Id<'JobOffer'> };

/** Records one view of a listing or job offer when its screen is opened. */
export function useRecordView(resource: Resource | null) {
  const recordView = useMutation(api.stats.recordView);
  const recorded = useRef<string | null>(null);
  const key = resource ? `${resource.type}:${resource.id}` : null;

  useEffect(() => {
    if (!resource || !key || recorded.current === key) return;
    recorded.current = key;
    void recordView({ resource, visitorId }).catch(() => {});
    // `resource` is identified by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, recordView]);
}
