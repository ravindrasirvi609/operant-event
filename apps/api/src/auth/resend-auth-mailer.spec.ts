import { createHash } from 'node:crypto';
import { ResendAuthMailer } from './resend-auth-mailer';

const recipient = { email: 'jane@example.com', firstName: 'Jane' };

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('ResendAuthMailer.sendEmailVerification', () => {
  it('sends a verification link pointing at FRONTEND_URL/verify-email with an idempotency key derived from the token', async () => {
    const send = jest
      .fn()
      .mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const mailer = new ResendAuthMailer(
      send,
      'noreply@example.com',
      'https://app.example.com',
    );

    await mailer.sendEmailVerification(recipient, 'raw-token-abc');

    expect(send).toHaveBeenCalledWith(
      {
        from: 'noreply@example.com',
        to: ['jane@example.com'],
        subject: 'Verify your email address',
        html: expect.stringContaining(
          'https://app.example.com/verify-email?token=raw-token-abc',
        ),
      },
      { idempotencyKey: `email-verification/${hash('raw-token-abc')}` },
    );
  });

  it('throws when Resend returns an error', async () => {
    const send = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'invalid domain' } });
    const mailer = new ResendAuthMailer(
      send,
      'noreply@example.com',
      'https://app.example.com',
    );

    await expect(
      mailer.sendEmailVerification(recipient, 'raw-token-abc'),
    ).rejects.toThrow('invalid domain');
  });
});

describe('ResendAuthMailer.sendPasswordReset', () => {
  it('sends a reset link pointing at FRONTEND_URL/password-reset/confirm with an idempotency key derived from the token', async () => {
    const send = jest
      .fn()
      .mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const mailer = new ResendAuthMailer(
      send,
      'noreply@example.com',
      'https://app.example.com',
    );

    await mailer.sendPasswordReset(recipient, 'raw-token-xyz');

    expect(send).toHaveBeenCalledWith(
      {
        from: 'noreply@example.com',
        to: ['jane@example.com'],
        subject: 'Reset your password',
        html: expect.stringContaining(
          'https://app.example.com/password-reset/confirm?token=raw-token-xyz',
        ),
      },
      { idempotencyKey: `password-reset/${hash('raw-token-xyz')}` },
    );
  });

  it('throws when Resend returns an error', async () => {
    const send = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'rate limited' } });
    const mailer = new ResendAuthMailer(
      send,
      'noreply@example.com',
      'https://app.example.com',
    );

    await expect(
      mailer.sendPasswordReset(recipient, 'raw-token-xyz'),
    ).rejects.toThrow('rate limited');
  });
});
