import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const SUBMISSION_TYPES = [
  'ORAL',
  'POSTER',
  'E_POSTER',
  'WORKSHOP',
  'SYMPOSIUM',
] as const;

export class SaveVersionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsIn(SUBMISSION_TYPES)
  submissionType?: (typeof SUBMISSION_TYPES)[number];

  @IsOptional()
  @IsString()
  presentationPreference?: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsObject()
  formData!: Record<string, unknown>;
}
