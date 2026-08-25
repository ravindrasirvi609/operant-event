import { IsIn } from 'class-validator';

const CONFERENCE_STATUSES = [
  'DRAFT',
  'OPEN',
  'REVIEW',
  'REGISTRATION',
  'ONGOING',
  'COMPLETED',
  'ARCHIVED',
] as const;

export class ChangeStatusDto {
  @IsIn(CONFERENCE_STATUSES)
  status!: (typeof CONFERENCE_STATUSES)[number];
}
