export const CERTIFICATE_STATUSES = ['ELIGIBLE', 'GENERATED', 'ISSUED', 'REVOKED'] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export const CERTIFICATE_TYPES = [
  'PARTICIPATION',
  'PRESENTATION',
  'SPEAKER',
  'REVIEWER',
  'CHAIR',
  'WORKSHOP',
] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export interface Certificate {
  id: string;
  conferenceId: string;
  registrationId: string;
  certificateType: CertificateType;
  certificateNumber: string;
  fileId: string | null;
  verificationCode: string;
  issuedAt: string | null;
  status: CertificateStatus;
}

export interface CertificateWithRegistration extends Certificate {
  registration: {
    id: string;
    registrationNumber: string;
    userId: string;
    status: string;
  };
}

/**
 * `GET certificates/verify/:code` (public) — this exact 6-field shape
 * is the ENTIRE response, verbatim from the backend. Never add fields
 * here to match what a UI might want; the backend deliberately returns
 * nothing else (no id, no verificationCode, no registration/user data).
 */
export interface CertificateVerification {
  certificateNumber: string;
  holderName: string;
  conferenceName: string;
  certificateType: CertificateType;
  issuedAt: string | null;
  status: CertificateStatus;
}
