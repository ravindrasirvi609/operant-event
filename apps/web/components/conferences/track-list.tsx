'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useCreateTrack, useReorderTracks, useTracks } from '@/hooks/use-tracks';

const trackSchema = z.object({
  name: z.string().min(1, 'Enter a track name.'),
  code: z.string().optional(),
  description: z.string().optional(),
});

type TrackValues = z.infer<typeof trackSchema>;

export function TrackList({ conferenceId }: { conferenceId: string }) {
  const tracksQuery = useTracks(conferenceId);
  const createTrack = useCreateTrack(conferenceId);
  const reorderTracks = useReorderTracks(conferenceId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackValues>({ resolver: zodResolver(trackSchema) });

  async function onCreate(values: TrackValues) {
    await createTrack.mutateAsync(values);
    reset();
  }

  function move(trackIds: string[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= trackIds.length) {
      return;
    }
    const next = [...trackIds];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderTracks.mutate(next);
  }

  return (
    <div className="max-w-xl space-y-6">
      <AsyncBoundary query={tracksQuery} empty={<p className="text-sm text-muted-foreground">No tracks yet.</p>}>
        {(tracks) => {
          const trackIds = tracks.map((track) => track.id);
          return (
            <ul className="divide-y rounded-lg border">
              {tracks.map((track, index) => (
                <li key={track.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{track.name}</p>
                    {track.code ? <p className="text-xs text-muted-foreground">{track.code}</p> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${track.name} up`}
                      disabled={index === 0 || reorderTracks.isPending}
                      onClick={() => move(trackIds, index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${track.name} down`}
                      disabled={index === tracks.length - 1 || reorderTracks.isPending}
                      onClick={() => move(trackIds, index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          );
        }}
      </AsyncBoundary>

      <form onSubmit={handleSubmit(onCreate)} className="space-y-3 border-t pt-4" noValidate>
        <h2 className="text-sm font-semibold">Add a track</h2>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Name" htmlFor="track-name" error={errors.name?.message}>
            <Input id="track-name" {...register('name')} />
          </FormField>
          <FormField label="Code (optional)" htmlFor="track-code" error={errors.code?.message}>
            <Input id="track-code" {...register('code')} />
          </FormField>
        </div>
        <FormField label="Description (optional)" htmlFor="track-description" error={errors.description?.message}>
          <Input id="track-description" {...register('description')} />
        </FormField>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add track'}
        </Button>
      </form>
    </div>
  );
}
