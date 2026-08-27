import { validateAuthorRow, validateRegistrationRow, validateReviewerRow } from './import-rows';

describe('validateAuthorRow', () => {
  it('requires firstName and lastName', () => {
    expect(validateAuthorRow({ firstName: '', lastName: 'Doe' })).toEqual({
      ok: false,
      error: 'firstName and lastName are required.',
    });
  });

  it('accepts a full row and trims whitespace, treating blank optional fields as absent', () => {
    const result = validateAuthorRow({
      firstName: ' Jane ',
      lastName: ' Doe ',
      email: '  ',
      institution: ' MIT ',
    });

    expect(result).toEqual({
      ok: true,
      value: { firstName: 'Jane', lastName: 'Doe', email: undefined, institution: 'MIT' },
    });
  });
});

describe('validateReviewerRow', () => {
  it('requires email', () => {
    expect(validateReviewerRow({})).toEqual({ ok: false, error: 'email is required.' });
  });

  it('accepts a row with email', () => {
    expect(validateReviewerRow({ email: 'jane@example.com' })).toEqual({
      ok: true,
      value: { email: 'jane@example.com' },
    });
  });
});

describe('validateRegistrationRow', () => {
  it('requires email, categoryName, and typeName together', () => {
    expect(validateRegistrationRow({ email: 'jane@example.com', categoryName: 'Student' })).toEqual({
      ok: false,
      error: 'email, categoryName, and typeName are all required.',
    });
  });

  it('accepts a fully-specified row', () => {
    expect(
      validateRegistrationRow({ email: 'jane@example.com', categoryName: 'Student', typeName: 'Early Bird' }),
    ).toEqual({
      ok: true,
      value: { email: 'jane@example.com', categoryName: 'Student', typeName: 'Early Bird' },
    });
  });
});
