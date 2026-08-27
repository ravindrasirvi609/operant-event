'use client';

import { SpeakerForm } from '@/components/program/speaker-form';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useSpeakers } from '@/hooks/use-speakers';

export function SpeakerRoster({ conferenceId }: { conferenceId: string }) {
  const speakersQuery = useSpeakers(conferenceId);

  return (
    <div className="max-w-2xl space-y-6">
      <AsyncBoundary query={speakersQuery} empty={<p className="text-sm text-muted-foreground">No speakers yet.</p>}>
        {(speakers) => (
          <ul className="divide-y rounded-lg border">
            {speakers.map((speaker) => (
              <li key={speaker.id} className="p-3">
                <p className="text-sm font-medium">{speaker.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[speaker.designation, speaker.institution, speaker.country].filter(Boolean).join(' · ') || '—'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
      <SpeakerForm conferenceId={conferenceId} />
    </div>
  );
}
