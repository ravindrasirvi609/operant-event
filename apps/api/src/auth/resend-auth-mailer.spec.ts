
import { createHash } from 'node:crypto';
import { ResendAuthMailer } from './resend-auth-mailer';

const recipient = { email: 'jane@example.com', firstName: 'Jane' };

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('ResendAuthMailer.sendEmailVerification', () => {
  it('sends a branded verification email with the correct link and idempotency key', async () => {
    const send = jest
      .fn()
      .mockResolvedValue({ data: { id: 'email-1' }, error: null });

    const mailer = new ResendAuthMailer(
      send,
      'noreply@example.com',
      'https://app.example.com',
    );

    await mailer.sendEmailVerification(recipient, 'raw-token-abc');

    const verificationUrl =
      'https://app.example.com/verify-email?token=raw-token-abc';

    expect(send).toHaveBeenCalledWith(
      {
        from: 'noreply@example.com',
        to: ['jane@example.com'],
        subject: 'Verify your email address | Operant Event',
        html: expect.stringContaining(verificationUrl),
        text: expect.stringContaining(verificationUrl),
      },
      {
        idempotencyKey: `email-verification/${hash('raw-token-abc')}`,
      },
    );

    const payload = send.mock.calls[0][0];

    expect(payload.html).toContain('Operant Event');
    expect(payload.html).toContain('Verify email address');
    expect(payload.html).toContain('Hello Jane');
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
  it('sends a branded password-reset email with the correct link and idempotency key', async () => {
    const send = jest
      .fn()
      .mockResolvedValue({ data: { id: 'email-1' }, error: null });

    const mailer = new ResendAuthMailer(
      send,
      'noreply@example.com',
      'https://app.example.com',
    );

    await mailer.sendPasswordReset(recipient, 'raw-token-xyz');

    const resetUrl =
      'https://app.example.com/password-reset/confirm?token=raw-token-xyz';

    expect(send).toHaveBeenCalledWith(
      {
        from: 'noreply@example.com',
        to: ['jane@example.com'],
        subject: 'Reset your password | Operant Event',
        html: expect.stringContaining(resetUrl),
        text: expect.stringContaining(resetUrl),
      },
      {
        idempotencyKey: `password-reset/${hash('raw-token-xyz')}`,
      },
    );

    const payload = send.mock.calls[0][0];

    expect(payload.html).toContain('Operant Event');
    expect(payload.html).toContain('Reset password');
    expect(payload.html).toContain('Hello Jane');
    expect(payload.html).toContain(
      'If you did not request this reset',
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
