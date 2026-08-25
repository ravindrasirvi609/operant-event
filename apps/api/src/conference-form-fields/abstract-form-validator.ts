export type FormFieldTypeName =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'RICH_TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'FILE'
  | 'URL';

export interface FormFieldDefinition {
  fieldKey: string;
  label: string;
  fieldType: FormFieldTypeName;
  isRequired: boolean;
  status: string;
  optionsJson?: unknown;
}

export interface ValidateAbstractFormOptions {
  requireRequiredFields: boolean;
}

/**
 * ABS-002/ABS-005: validates submitted form data against the conference's
 * currently active field set. Pass requireRequiredFields: false for a draft
 * save (ABS-001 — "draft can be saved without completing required fields")
 * and true (the default) when actually submitting.
 */
export function validateAbstractFormData(
  fields: FormFieldDefinition[],
  formData: Record<string, unknown>,
  options: ValidateAbstractFormOptions = { requireRequiredFields: true },
): string[] {
  const errors: string[] = [];
  const activeFields = fields.filter((field) => field.status === 'ACTIVE');
  const activeKeys = new Set(activeFields.map((field) => field.fieldKey));

  for (const key of Object.keys(formData)) {
    if (!activeKeys.has(key)) {
      errors.push(
        `Unknown field "${key}" is not part of the active submission form.`,
      );
    }
  }

  for (const field of activeFields) {
    const value = formData[field.fieldKey];
    const isPresent = value !== undefined && value !== null && value !== '';

    if (!isPresent) {
      if (field.isRequired && options.requireRequiredFields) {
        errors.push(`"${field.label}" is required.`);
      }
      continue;
    }

    const typeError = validateFieldType(field, value);
    if (typeError) {
      errors.push(typeError);
    }
  }

  return errors;
}

function validateFieldType(
  field: FormFieldDefinition,
  value: unknown,
): string | null {
  switch (field.fieldType) {
    case 'TEXT':
    case 'LONG_TEXT':
    case 'RICH_TEXT':
      return typeof value === 'string'
        ? null
        : `"${field.label}" must be text.`;

    case 'NUMBER':
      return typeof value === 'number' && !Number.isNaN(value)
        ? null
        : `"${field.label}" must be a number.`;

    case 'DATE':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value))
        ? null
        : `"${field.label}" must be a valid date.`;

    case 'CHECKBOX':
      return typeof value === 'boolean'
        ? null
        : `"${field.label}" must be true or false.`;

    case 'URL':
      return isValidUrl(value) ? null : `"${field.label}" must be a valid URL.`;

    case 'SELECT':
    case 'RADIO': {
      const options = toOptionValues(field.optionsJson);
      return options.includes(value as string)
        ? null
        : `"${field.label}" must be one of: ${options.join(', ')}.`;
    }

    case 'MULTI_SELECT': {
      if (!Array.isArray(value)) {
        return `"${field.label}" must be a list of values.`;
      }
      const options = toOptionValues(field.optionsJson);
      const values: unknown[] = value;
      const invalid = values.filter(
        (entry) => !options.includes(entry as string),
      );
      return invalid.length === 0
        ? null
        : `"${field.label}" contains invalid selection(s): ${invalid.join(', ')}.`;
    }

    case 'FILE':
      return typeof value === 'string'
        ? null
        : `"${field.label}" must reference an uploaded file.`;

    default:
      return null;
  }
}

function toOptionValues(optionsJson: unknown): string[] {
  return Array.isArray(optionsJson) ? (optionsJson as string[]) : [];
}

function isValidUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
