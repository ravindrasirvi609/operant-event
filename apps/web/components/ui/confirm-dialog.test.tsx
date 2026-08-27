import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  it('calls onConfirm when the confirm button is clicked and no typed confirmation is required', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Withdraw abstract?"
        confirmLabel="Withdraw"
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Withdraw' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog open onOpenChange={onOpenChange} title="Withdraw abstract?" onConfirm={() => {}} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables the confirm button until the required typed confirmation matches exactly', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Refund this order?"
        confirmLabel="Refund"
        onConfirm={onConfirm}
        requireTypedConfirmation="REFUND"
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Refund' });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByRole('textbox');
    await user.type(input, 'refund');
    expect(confirmButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'REFUND');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button while isConfirming is true', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Refund this order?"
        confirmLabel="Refund"
        onConfirm={() => {}}
        isConfirming
      />,
    );

    expect(screen.getByRole('button', { name: 'Refund' })).toBeDisabled();
  });

  it('renders optional children between the description and the confirmation controls', () => {
    render(
      <ConfirmDialog open onOpenChange={() => {}} title="Reject this claim?" onConfirm={() => {}}>
        <p>Extra reason field goes here.</p>
      </ConfirmDialog>,
    );

    expect(screen.getByText('Extra reason field goes here.')).toBeInTheDocument();
  });

  it('renders nothing when open is false', () => {
    render(
      <ConfirmDialog open={false} onOpenChange={() => {}} title="Withdraw abstract?" onConfirm={() => {}} />,
    );

    expect(screen.queryByText('Withdraw abstract?')).not.toBeInTheDocument();
  });
});
