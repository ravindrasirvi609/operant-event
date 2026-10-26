
import { createHash } from 'node:crypto';
import type {
  AuthMailer,
  AuthMailerRecipient,
  AuthInvitationDetails,
} from './auth-mailer.interface';

export interface SendAuthEmailResult {
  data: { id: string } | null;
  error: { message: string } | null;
}

export type SendAuthEmailFn = (
  payload: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text?: string;
  },
  options: { idempotencyKey: string },
) => Promise<SendAuthEmailResult>;

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char];
  });
}

function emailLayout(content: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Operant Event</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#172554;padding:24px 32px;color:#ffffff;">
            <div style="font-size:24px;font-weight:700;letter-spacing:.2px;">Operant Event</div>
            <div style="font-size:13px;color:#dbeafe;margin-top:6px;">Conference Management Platform</div>
          </td>
        </tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">
            This is an automated email from Operant Event. Please do not share your password or secure links with anyone.
          </td>
        </tr>
      </table>
      <div style="padding:18px 8px;color:#6b7280;font-size:12px;text-align:center;">
        &copy; Operant Event
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

export class ResendAuthMailer implements AuthMailer {
  constructor(
    private readonly send: SendAuthEmailFn,
    private readonly fromAddress: string,
    private readonly frontendUrl: string,
  ) {}

  sendEmailVerification(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const name = escapeHtml(recipient.firstName);

    return this.dispatch(
      recipient,
      'email-verification',
      rawToken,
      'Verify your email address | Operant Event',
      emailLayout(`
        <h1 style="font-size:24px;margin:0 0 20px;">Verify your email address</h1>
        <p style="font-size:15px;line-height:1.7;">Hello ${name},</p>
        <p style="font-size:15px;line-height:1.7;">Please verify your email address to continue using Operant Event.</p>
        ${this.button(url, 'Verify email address')}
        <p style="font-size:13px;line-height:1.7;color:#6b7280;">If the button does not work, copy and paste this link into your browser:</p>
        <p style="font-size:13px;overflow-wrap:anywhere;"><a href="${url}">${url}</a></p>
      `),
      `Hello ${recipient.firstName},\n\nPlease verify your email address:\n${url}\n\nOperant Event`,
    );
  }

  sendPasswordReset(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void> {
    const url = `${this.frontendUrl}/password-reset/confirm?token=${encodeURIComponent(rawToken)}`;
    const name = escapeHtml(recipient.firstName);

    return this.dispatch(
      recipient,
      'password-reset',
      rawToken,
      'Reset your password | Operant Event',
      emailLayout(`
        <h1 style="font-size:24px;margin:0 0 20px;">Reset your password</h1>
        <p style="font-size:15px;line-height:1.7;">Hello ${name},</p>
        <p style="font-size:15px;line-height:1.7;">We received a request to reset your Operant Event password. Use the button below to continue.</p>
        ${this.button(url, 'Reset password')}
        <p style="font-size:13px;line-height:1.7;color:#6b7280;">If the button does not work, copy and paste this link into your browser:</p>
        <p style="font-size:13px;overflow-wrap:anywhere;"><a href="${url}">${url}</a></p>
        <p style="font-size:13px;line-height:1.7;color:#6b7280;">If you did not request this reset, you can ignore this email.</p>
      `),
      `Hello ${recipient.firstName},\n\nReset your Operant Event password using this link:\n${url}\n\nIf you did not request this reset, ignore this email.`,
    );
  }

  sendOrganizationInvitation(
    recipient: AuthMailerRecipient,
    rawToken: string,
    details: AuthInvitationDetails,
  ): Promise<void> {
    const url = `${this.frontendUrl}/password-reset/confirm?token=${encodeURIComponent(rawToken)}`;
    const name = escapeHtml(recipient.firstName);
    const organizationName = escapeHtml(details.organizationName);
    const roleName = escapeHtml(details.roleName);

    return this.dispatch(
      recipient,
      'organization-invitation',
      rawToken,
      `You're invited to join ${details.organizationName} | Operant Event`,
      emailLayout(`
        <h1 style="font-size:24px;line-height:1.3;margin:0 0 20px;">You're invited to join the team!</h1>
        <p style="font-size:15px;line-height:1.7;">Hello ${name},</p>
        <p style="font-size:15px;line-height:1.7;">You've been invited to join <strong>${organizationName}</strong> on Operant Event.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:20px 0;">
          <tr><td style="padding:16px;">
            <div style="font-size:12px;color:#6b7280;margin-bottom:5px;">YOUR ASSIGNED ROLE</div>
            <div style="font-size:16px;font-weight:700;">${roleName}</div>
          </td></tr>
        </table>
        <p style="font-size:15px;line-height:1.7;">Your account is almost ready. Set your password using the secure button below to activate your access.</p>
        ${this.button(url, 'Set your password')}
        <p style="font-size:13px;line-height:1.7;color:#6b7280;">If the button does not work, copy and paste this link into your browser:</p>
        <p style="font-size:13px;overflow-wrap:anywhere;"><a href="${url}">${url}</a></p>
        <p style="font-size:13px;line-height:1.7;color:#6b7280;">This invitation link expires in 7 days. If you were not expecting this invitation, you can safely ignore this email.</p>
      `),
      `Hello ${recipient.firstName},\n\nYou've been invited to join ${details.organizationName} on Operant Event.\nAssigned role: ${details.roleName}\n\nSet your password using this secure link:\n${url}\n\nThis invitation link expires in 7 days. If you were not expecting this invitation, ignore this email.\n\nThe Operant Event Team`,
    );
  }

  private button(url: string, label: string): string {
    return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
      <tr><td bgcolor="#172554" style="border-radius:7px;text-align:center;">
        <a href="${url}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:7px;">${label}</a>
      </td></tr>
    </table>`;
  }

  private async dispatch(
    recipient: AuthMailerRecipient,
    eventType: string,
    rawToken: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    const { error } = await this.send(
      {
        from: this.fromAddress,
        to: [recipient.email],
        subject,
        html,
        ...(text ? { text } : {}),
      },
      { idempotencyKey: `${eventType}/${hashToken(rawToken)}` },
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}
