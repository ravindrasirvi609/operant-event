import { IsIn, IsOptional, IsString } from 'class-validator';

const DECISIONS = [
  'ACCEPTED',
  'REJECTED',
  'REVISION_REQUIRED',
  'WAITLISTED',
] as const;

export class RecordDecisionDto {
  @IsIn(DECISIONS)
  decision!: (typeof DECISIONS)[number];

  @IsOptional()
  @IsString()
  reason?: string;
}
