import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SpeakerAssignmentEditor } from './speaker-assignment-editor';
import type { Speaker } from '@/lib/program/types';

const speakers: Speaker[] = [
  { id: 'sp-1', conferenceId: 'conf-1', userId: null, name: 'Ada Lovelace', designation: null, institution: null, bio: null, photoFileId: null, country: null },
  { id: 'sp-2', conferenceId: 'conf-1', userId: null, name: 'Alan Turing', designation: null, institution: null, bio: null, photoFileId: null, country: null },
];

describe('SpeakerAssignmentEditor', () => {
  it('submits the current assignments as the full array', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <SpeakerAssignmentEditor
        speakers={speakers}
        defaultAssignments={[{ speakerId: 'sp-1', role: 'SPEAKER' }]}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith([{ speakerId: 'sp-1', role: 'SPEAKER' }]);
  });

  it('submits an empty array when every row is removed — this clears all speakers on the session, not a no-op', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <SpeakerAssignmentEditor
        speakers={speakers}
        defaultAssignments={[{ speakerId: 'sp-1', role: 'SPEAKER' }]}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith([]);
  });
});
