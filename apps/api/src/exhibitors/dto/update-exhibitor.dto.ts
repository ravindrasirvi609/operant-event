import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const PAYMENT_STATUSES = ['PENDING', 'INVOICED', 'PAID'] as const;

export class UpdateExhibitorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @IsOptional()
  @IsString()
  boothNumber?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: (typeof PAYMENT_STATUSES)[number];
}
