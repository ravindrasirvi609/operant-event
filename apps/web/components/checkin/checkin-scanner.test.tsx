
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckinScanner } from './checkin-scanner';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CheckinScanner', () => {
  it('checks in via manual search without camera permission', async () => {
    const onCheckIn = vi.fn().mockResolvedValue({
      checkin: { id: 'checkin-1' },
      reused: false,
    });
    const user = userEvent.setup({ delay: null });

    render(<CheckinScanner conferenceId="conf-1" onCheckIn={onCheckIn} />);

    await user.type(screen.getByLabelText(/search/i), 'REG-000123');
    await user.click(screen.getByRole('button', { name: /check in/i }));

    await waitFor(() => {
      expect(onCheckIn).toHaveBeenCalledWith({
        conferenceId: 'conf-1',
        registrationNumber: 'REG-000123',
        checkinType: 'MAIN_EVENT',
        deviceId: expect.any(String),
      });
    });

    expect(await screen.findByText(/checked in/i)).toBeInTheDocument();
  });

  it('shows a calm already-checked-in state when the response says reused', async () => {
    const onCheckIn = vi.fn().mockResolvedValue({
      checkin: { id: 'checkin-1' },
      reused: true,
    });
    const user = userEvent.setup({ delay: null });

    render(<CheckinScanner conferenceId="conf-1" onCheckIn={onCheckIn} />);

    await user.type(screen.getByLabelText(/search/i), 'REG-000123');
    await user.click(screen.getByRole('button', { name: /check in/i }));

    expect(await screen.findByText(/already checked in/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error and automatically dismisses it after a few seconds', async () => {
    const onCheckIn = vi.fn().mockRejectedValue(
      new Error('This registration is PENDING and cannot be checked in.'),
    );
    const user = userEvent.setup({ delay: null });

    render(<CheckinScanner conferenceId="conf-1" onCheckIn={onCheckIn} />);

    await user.type(screen.getByLabelText(/search/i), 'REG-000999');
    await user.click(screen.getByRole('button', { name: /check in/i }));

    expect(await screen.findByText(/This registration is PENDING/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.queryByText(/This registration is PENDING/i)).not.toBeInTheDocument();
  });

  it('does not show an Allow re-entry toggle', () => {
    const onCheckIn = vi.fn();

    render(<CheckinScanner conferenceId="conf-1" onCheckIn={onCheckIn} />);

    expect(screen.queryByLabelText(/allow re-entry/i)).not.toBeInTheDocument();
  });
});
