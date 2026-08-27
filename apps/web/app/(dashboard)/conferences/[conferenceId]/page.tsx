'use client';

import { use, useState } from 'react';
import { ConferenceForm, conferenceToFormValues, type ConferenceFormValues } from '@/components/conferences/conference-form';
import { ConferenceStatusBadge } from '@/components/conferences/conference-status-badge';
import { PublishConferenceButton } from '@/components/conferences/publish-conference-button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChangeConferenceStatus, useConference, useUpdateConference } from '@/hooks/use-conferences';
import { useMyPermissions } from '@/hooks/use-organizations';
import { CONFERENCE_STATUSES, type ConferenceStatus } from '@/lib/conferences/types';
import { ApiError } from '@/lib/api/backend';
import { hasPermission, PERMISSIONS } from '@/lib/api/permissions';

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) {
    return "You don't have permission to do this.";
  }
  return error instanceof Error ? error.message : fallback;
}

export default function ConferenceOverviewPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  const conferenceQuery = useConference(conferenceId);
  const updateConference = useUpdateConference(conferenceId);
  const changeStatus = useChangeConferenceStatus(conferenceId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const organizationId = conferenceQuery.data?.organizationId ?? '';
  const permissionsQuery = useMyPermissions(organizationId);
  const canUpdate = hasPermission(permissionsQuery.data ?? [], PERMISSIONS.CONFERENCE_UPDATE);

  async function handleSave(values: ConferenceFormValues) {
    setSaveError(null);
    setSaved(false);
    try {
      await updateConference.mutateAsync(values);
      setSaved(true);
    } catch (error) {
      setSaveError(toErrorMessage(error, 'Failed to save.'));
    }
  }

  return (
    <AsyncBoundary query={conferenceQuery}>
      {(conference) => (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <ConferenceStatusBadge status={conference.status} />
            <PublishConferenceButton conferenceId={conferenceId} status={conference.status} />
          </div>

          {canUpdate ? (
            <>
              <div className="space-y-2">
                <span className="text-sm font-medium">Advanced: set status directly</span>
                <Select
                  value={conference.status}
                  onValueChange={(value) => value && changeStatus.mutate(value as ConferenceStatus)}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFERENCE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {changeStatus.isError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {toErrorMessage(changeStatus.error, 'Failed to change status.')}
                  </p>
                ) : null}
              </div>

              <ConferenceForm
                defaultValues={conferenceToFormValues(conference)}
                onSubmit={handleSave}
                submitLabel="Save changes"
              />
              {saved ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Saved.
                </p>
              ) : null}
              {saveError ? (
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to edit this conference.
            </p>
          )}
        </div>
      )}
    </AsyncBoundary>
  );
}
