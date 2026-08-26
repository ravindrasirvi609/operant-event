import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const TIERS = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const;
const PAYMENT_STATUSES = ['PENDING', 'INVOICED', 'PAID'] as const;

export class UpdateSponsorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(TIERS)
  tier?: (typeof TIERS)[number];

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  logoFileId?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: (typeof PAYMENT_STATUSES)[number];
}
