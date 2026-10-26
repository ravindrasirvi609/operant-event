
export interface AuthMailerRecipient {
  email: string;
  firstName: string;
}

export interface AuthInvitationDetails {
  organizationName: string;
  roleName: string;
}

export interface AuthMailer {
  sendEmailVerification(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void>;

  sendPasswordReset(
    recipient: AuthMailerRecipient,
    rawToken: string,
  ): Promise<void>;

  sendOrganizationInvitation(
    recipient: AuthMailerRecipient,
    rawToken: string,
    details: AuthInvitationDetails,
  ): Promise<void>;
}

export const AUTH_MAILER = Symbol('AUTH_MAILER');
