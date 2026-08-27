import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/backend';
import { PaymentProofUpload } from './payment-proof-upload';

describe('PaymentProofUpload', () => {
  it('submits the uploaded proofFileId and reference on success', async () => {
    const uploadFile = vi.fn().mockResolvedValue('file_1');
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PaymentProofUpload uploadFile={uploadFile} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/reference/i), 'UTR-12345');
    const file = new File(['x'], 'receipt.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/proof file/i), file);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ reference: 'UTR-12345', proofFileId: 'file_1' }));
  });

  it('falls back to reference-only submission and discloses the gap when upload is blocked by a 403', async () => {
    const uploadFile = vi.fn().mockRejectedValue(new ApiError(403, 'Forbidden'));
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PaymentProofUpload uploadFile={uploadFile} onSubmit={onSubmit} />);

    const file = new File(['x'], 'receipt.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/proof file/i), file);

    expect(await screen.findByText(/file upload is currently blocked/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/reference/i), 'UTR-99999');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ reference: 'UTR-99999', proofFileId: undefined }));
  });
});
