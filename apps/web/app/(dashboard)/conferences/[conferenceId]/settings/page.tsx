'use client';

import { use } from 'react';
import { ConferenceSettingsForm } from '@/components/conferences/conference-settings-form';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useConferenceSettings } from '@/hooks/use-conference-settings';

export default function ConferenceSettingsPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  const settingsQuery = useConferenceSettings(conferenceId);

  return (
    <AsyncBoundary query={settingsQuery}>
      {(settings) => <ConferenceSettingsForm conferenceId={conferenceId} settings={settings} />}
    </AsyncBoundary>
  );
}
