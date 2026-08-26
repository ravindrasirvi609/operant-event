import { IsIn } from 'class-validator';

const EXPORT_TYPES = [
  'ABSTRACTS',
  'REGISTRATIONS',
  'PAYMENTS',
  'AUDIT_LOG',
] as const;

export class CreateExportDto {
  @IsIn(EXPORT_TYPES)
  type!: (typeof EXPORT_TYPES)[number];
}
