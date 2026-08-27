'use client';

import { ReviewerRoster } from '@/components/reviewers/reviewer-roster';
import { useActiveOrganization } from '@/hooks/use-active-organization';

export default function ConferenceReviewersPage() {
  const { activeOrgId } = useActiveOrganization();

  if (!activeOrgId) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return <ReviewerRoster organizationId={activeOrgId} />;
}
