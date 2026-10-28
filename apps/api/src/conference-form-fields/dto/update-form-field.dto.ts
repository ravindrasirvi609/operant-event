import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const FIELD_TYPES = [
  'TEXT',
  'LONG_TEXT',
  'RICH_TEXT',
  'NUMBER',
  'DATE',
  'SELECT',
  'MULTI_SELECT',
  'RADIO',
  'CHECKBOX',
  'FILE',
  'URL',
  'AUTHOR_BLOCK',
] as const;

export class UpdateFormFieldDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsIn(FIELD_TYPES)
  fieldType?: (typeof FIELD_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  optionsJson?: unknown;

  @IsOptional()
  validationJson?: unknown;

  @IsOptional()
  sortOrder?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';
}