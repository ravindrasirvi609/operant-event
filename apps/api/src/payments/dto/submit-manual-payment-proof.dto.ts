import { IsOptional, IsString } from 'class-validator';

export class SubmitManualPaymentProofDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  proofFileId?: string;
}
