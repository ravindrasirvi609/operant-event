import {
  validateAbstractFormData,
  type FormFieldDefinition,
} from './abstract-form-validator';

const titleField: FormFieldDefinition = {
  fieldKey: 'title',
  label: 'Title',
  fieldType: 'TEXT',
  isRequired: true,
  status: 'ACTIVE',
};

const trackTypeField: FormFieldDefinition = {
  fieldKey: 'researchType',
  label: 'Research Type',
  fieldType: 'SELECT',
  isRequired: false,
  status: 'ACTIVE',
  optionsJson: ['CLINICAL', 'BASIC_SCIENCE'],
};

describe('validateAbstractFormData', () => {
  it('passes when every required active field is present and valid', () => {
    const errors = validateAbstractFormData([titleField], {
      title: 'A new therapy',
    });
    expect(errors).toEqual([]);
  });

  it('reports a missing required field when submitting', () => {
    const errors = validateAbstractFormData([titleField], {});
    expect(errors).toEqual(['"Title" is required.']);
  });

  it('does not require the field when saving a draft', () => {
    const errors = validateAbstractFormData(
      [titleField],
      {},
      { requireRequiredFields: false },
    );
    expect(errors).toEqual([]);
  });

  it('rejects a key that is not part of the active form', () => {
    const errors = validateAbstractFormData([titleField], {
      title: 'x',
      bogusField: 'y',
    });
    expect(errors).toContain(
      'Unknown field "bogusField" is not part of the active submission form.',
    );
  });

  it('ignores a disabled field entirely — never required, never flagged as unknown', () => {
    const disabled: FormFieldDefinition = { ...titleField, status: 'DISABLED' };
    const errors = validateAbstractFormData([disabled], {});
    expect(errors).toEqual([]);
  });

  it('rejects a NUMBER field given a non-numeric value', () => {
    const field: FormFieldDefinition = {
      ...titleField,
      fieldKey: 'sampleSize',
      fieldType: 'NUMBER',
    };
    const errors = validateAbstractFormData([field], {
      sampleSize: 'not-a-number',
    });
    expect(errors).toEqual(['"Title" must be a number.']);
  });

  it('accepts a NUMBER field given a real number', () => {
    const field: FormFieldDefinition = {
      ...titleField,
      fieldKey: 'sampleSize',
      fieldType: 'NUMBER',
    };
    expect(validateAbstractFormData([field], { sampleSize: 42 })).toEqual([]);
  });

  it('rejects a DATE field that is not a parseable date', () => {
    const field: FormFieldDefinition = {
      ...titleField,
      fieldKey: 'trialDate',
      fieldType: 'DATE',
    };
    const errors = validateAbstractFormData([field], {
      trialDate: 'not-a-date',
    });
    expect(errors).toEqual(['"Title" must be a valid date.']);
  });

  it('rejects a SELECT value outside the configured options', () => {
    const errors = validateAbstractFormData([trackTypeField], {
      researchType: 'ASTROLOGY',
    });
    expect(errors).toEqual([
      '"Research Type" must be one of: CLINICAL, BASIC_SCIENCE.',
    ]);
  });

  it('accepts a SELECT value that is one of the configured options', () => {
    expect(
      validateAbstractFormData([trackTypeField], { researchType: 'CLINICAL' }),
    ).toEqual([]);
  });

  it('rejects a MULTI_SELECT value that is not an array', () => {
    const field: FormFieldDefinition = {
      ...trackTypeField,
      fieldKey: 'keywords',
      fieldType: 'MULTI_SELECT',
    };
    const errors = validateAbstractFormData([field], { keywords: 'CLINICAL' });
    expect(errors).toEqual(['"Research Type" must be a list of values.']);
  });

  it('rejects a MULTI_SELECT array containing a value outside the configured options', () => {
    const field: FormFieldDefinition = {
      ...trackTypeField,
      fieldKey: 'keywords',
      fieldType: 'MULTI_SELECT',
    };
    const errors = validateAbstractFormData([field], {
      keywords: ['CLINICAL', 'ASTROLOGY'],
    });
    expect(errors).toEqual([
      '"Research Type" contains invalid selection(s): ASTROLOGY.',
    ]);
  });

  it('rejects a CHECKBOX value that is not a boolean', () => {
    const field: FormFieldDefinition = {
      ...titleField,
      fieldKey: 'conflictOfInterest',
      fieldType: 'CHECKBOX',
    };
    const errors = validateAbstractFormData([field], {
      conflictOfInterest: 'yes',
    });
    expect(errors).toEqual(['"Title" must be true or false.']);
  });

  it('rejects a URL field that is not a valid URL', () => {
    const field: FormFieldDefinition = {
      ...titleField,
      fieldKey: 'preprintLink',
      fieldType: 'URL',
    };
    const errors = validateAbstractFormData([field], {
      preprintLink: 'not a url',
    });
    expect(errors).toEqual(['"Title" must be a valid URL.']);
  });

  it('accepts a valid URL', () => {
    const field: FormFieldDefinition = {
      ...titleField,
      fieldKey: 'preprintLink',
      fieldType: 'URL',
    };
    expect(
      validateAbstractFormData([field], {
        preprintLink: 'https://example.com/paper',
      }),
    ).toEqual([]);
  });
});
