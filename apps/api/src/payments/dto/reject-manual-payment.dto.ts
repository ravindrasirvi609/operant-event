import { IsOptional, IsString } from 'class-validator';

export class RejectManualPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
