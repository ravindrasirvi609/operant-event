import { IsIn, IsString, MinLength } from 'class-validator';

const IMPORT_TYPES = ['AUTHORS', 'REVIEWERS', 'REGISTRATIONS'] as const;

export class CreateImportDto {
  @IsIn(IMPORT_TYPES)
  type!: (typeof IMPORT_TYPES)[number];

  @IsString()
  @MinLength(1)
  sourceFileId!: string;
}
