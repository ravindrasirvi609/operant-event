
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EnsureFeedbackCertificateTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  conferenceId?: string;
}
