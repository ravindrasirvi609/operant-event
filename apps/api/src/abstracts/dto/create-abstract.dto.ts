import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const SUBMISSION_TYPES = [
  'ORAL',
  'POSTER',
  'E_POSTER',
  'WORKSHOP',
  'SYMPOSIUM',
] as const;

export class CreateAbstractDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsIn(SUBMISSION_TYPES)
  submissionType!: (typeof SUBMISSION_TYPES)[number];

  @IsOptional()
  @IsString()
  presentationPreference?: string;

  @IsOptional()
  @IsString()
  trackId?: string;
}
