export const SPONSOR_TIERS = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'INVOICED', 'PAID'] as const;
export type SponsorPaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Sponsor {
  id: string;
  conferenceId: string;
  name: string;
  tier: SponsorTier;
  contactName: string | null;
  contactEmail: string | null;
  paymentStatus: SponsorPaymentStatus;
  logoFileId: string | null;
}
