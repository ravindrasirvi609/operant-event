import type { SponsorPaymentStatus } from '@/lib/sponsors/types';

export interface ExhibitorStaff {
  id: string;
  exhibitorId: string;
  name: string;
  email: string | null;
}

export interface Exhibitor {
  id: string;
  conferenceId: string;
  companyName: string;
  boothNumber: string | null;
  contactPerson: string | null;
  paymentStatus: SponsorPaymentStatus;
  staff: ExhibitorStaff[];
}
