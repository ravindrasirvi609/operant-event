import { validateConferencePublishReadiness } from './conference-publish-validator';

const disabled = {
  abstractEnabled: false,
  abstractStartDate: null,
  abstractEndDate: null,
  registrationEnabled: false,
  registrationStartDate: null,
  registrationEndDate: null,
};

describe('validateConferencePublishReadiness', () => {
  it('returns no errors when nothing is enabled', () => {
    expect(validateConferencePublishReadiness(disabled)).toEqual([]);
  });

  it('returns an error when settings have never been configured', () => {
    expect(validateConferencePublishReadiness(null)).toEqual([
      'Conference settings have not been configured yet.',
    ]);
  });

  it('requires both abstract dates when abstract submission is enabled', () => {
    const errors = validateConferencePublishReadiness({
      ...disabled,
      abstractEnabled: true,
    });
    expect(errors).toContain(
      'Abstract submission is enabled but abstractStartDate is not set.',
    );
    expect(errors).toContain(
      'Abstract submission is enabled but abstractEndDate is not set.',
    );
  });

  it('requires abstractStartDate to be before abstractEndDate', () => {
    const errors = validateConferencePublishReadiness({
      ...disabled,
      abstractEnabled: true,
      abstractStartDate: new Date('2027-06-01'),
      abstractEndDate: new Date('2027-01-01'),
    });
    expect(errors).toContain(
      'abstractStartDate must be before abstractEndDate.',
    );
  });

  it('is satisfied when abstract submission is enabled with valid dates', () => {
    const errors = validateConferencePublishReadiness({
      ...disabled,
      abstractEnabled: true,
      abstractStartDate: new Date('2027-01-01'),
      abstractEndDate: new Date('2027-06-01'),
    });
    expect(errors).toEqual([]);
  });

  it('requires both registration dates when registration is enabled', () => {
    const errors = validateConferencePublishReadiness({
      ...disabled,
      registrationEnabled: true,
    });
    expect(errors).toContain(
      'Registration is enabled but registrationStartDate is not set.',
    );
    expect(errors).toContain(
      'Registration is enabled but registrationEndDate is not set.',
    );
  });
});
