'use client';

import { use, useState } from 'react';
import { ConferenceForm, conferenceToFormValues, type ConferenceFormValues } from '@/components/conferences/conference-form';
import { ConferenceStatusBadge } from '@/components/conferences/conference-status-badge';
import { PublishConferenceButton } from '@/components/conferences/publish-conference-button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChangeConferenceStatus, useConference, useUpdateConference } from '@/hooks/use-conferences';
import { CONFERENCE_STATUSES, type ConferenceStatus } from '@/lib/conferences/types';
import { ApiError } from '@/lib/api/backend';

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) {
    return "You don't have permission to do this.";
  }
  return error instanceof Error ? error.message : fallback;
}

/**
 * No endpoint currently exposes "my effective permissions for this
 * organization" to the client (there's no member list, no per-membership
 * roles lookup) — so this page cannot hide edit controls from a caller
 * who genuinely lacks CONFERENCE_UPDATE the way the Definition of Done in
 * docs/plans/frontend/01-...md asks for. Controls are always rendered;
 * the real gate is still the backend's PermissionsGuard on every mutating
 * call, and a 403 from any of them surfaces as a clear message rather
 * than a generic error. This is a known gap, not a silent shortcut —
 * revisit once an effective-permissions endpoint exists.
 */
export default function ConferenceOverviewPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  const conferenceQuery = useConference(conferenceId);
  const updateConference = useUpdateConference(conferenceId);
  const changeStatus = useChangeConferenceStatus(conferenceId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
        </div>
      )}
    </AsyncBoundary>
  );
}
