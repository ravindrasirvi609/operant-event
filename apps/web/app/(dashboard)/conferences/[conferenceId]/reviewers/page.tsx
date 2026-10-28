'use client';

import { useParams } from 'next/navigation';

import { ReviewerRoster } from '@/components/reviewers/reviewer-roster';
import { useActiveOrganization } from '@/hooks/use-active-organization';

export default function ConferenceReviewersPage() {
  const params = useParams<{ conferenceId: string }>();
  const { activeOrgId } = useActiveOrganization();

  const conferenceId = params?.conferenceId;

  if (!activeOrgId || !conferenceId) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading…
      </p>
    );
  }

  return (
    <ReviewerRoster
      organizationId={activeOrgId}
      conferenceId={conferenceId}
    />
  );
}