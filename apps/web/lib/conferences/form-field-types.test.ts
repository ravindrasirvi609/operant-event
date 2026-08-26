import { describe, expect, it } from 'vitest';
import { FORM_FIELD_TYPES } from './form-field-types';

describe('FORM_FIELD_TYPES', () => {
  it('matches apps/api/src/conference-form-fields/abstract-form-validator.ts exactly, in order', () => {
    expect(FORM_FIELD_TYPES).toEqual([
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
    ]);
  });

  it('has no duplicate entries', () => {
    expect(new Set(FORM_FIELD_TYPES).size).toBe(FORM_FIELD_TYPES.length);
  });
});
