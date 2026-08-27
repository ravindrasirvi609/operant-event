'use client';

import { use } from 'react';
import { AssignmentBoard } from '@/components/reviewers/assignment-board';
import { useActiveOrganization } from '@/hooks/use-active-organization';

export default function ConferenceReviewAssignmentsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  const { activeOrgId } = useActiveOrganization();

  if (!activeOrgId) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return <AssignmentBoard organizationId={activeOrgId} conferenceId={conferenceId} />;
}
