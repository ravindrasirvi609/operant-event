/** Literal mirror of apps/api/src/conference-form-fields/abstract-form-validator.ts's FormFieldTypeName union. */
export const FORM_FIELD_TYPES = [
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

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FORM_FIELD_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export type FormFieldStatus = (typeof FORM_FIELD_STATUSES)[number];

/** Types whose optionsJson is a list of choices the field validates against. */
export function fieldTypeHasOptions(type: FormFieldType): boolean {
  return type === 'SELECT' || type === 'MULTI_SELECT' || type === 'RADIO';
}
