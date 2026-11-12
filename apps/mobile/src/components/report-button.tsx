import { useConvexAuth } from 'convex/react';
import { useRouter } from 'expo-router';

import { Button } from './button';

export type ReportTargetType = 'post' | 'job' | 'listing' | 'community' | 'provider';

/** Opens the report form for a piece of content (sign-in first when needed). */
export function ReportButton({ type, id, title }: { type: ReportTargetType; id: string; title?: string }) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  return (
    <Button
      label="Signaler"
      icon="flag-outline"
      variant="ghost"
      onPress={() =>
        isAuthenticated
          ? router.push({ pathname: '/report', params: { type, id, ...(title ? { title } : {}) } })
          : router.navigate('/account')
      }
    />
  );
}
