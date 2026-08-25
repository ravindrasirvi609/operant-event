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
] as const;

export class CreateFormFieldDto {
  @IsString()
  @MinLength(1)
  section!: string;

  @IsString()
  @MinLength(1)
  fieldKey!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsIn(FIELD_TYPES)
  fieldType!: (typeof FIELD_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  optionsJson?: unknown;

  @IsOptional()
  validationJson?: unknown;
}
