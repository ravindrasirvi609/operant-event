export interface ConferencePublishSettings {
  abstractEnabled: boolean;
  abstractStartDate: Date | null;
  abstractEndDate: Date | null;
  registrationEnabled: boolean;
  registrationStartDate: Date | null;
  registrationEndDate: Date | null;
}

/** Returns an empty array when ready to publish, or one message per problem otherwise. */
export function validateConferencePublishReadiness(
  settings: ConferencePublishSettings | null,
): string[] {
  if (!settings) {
    return ['Conference settings have not been configured yet.'];
  }

  const errors: string[] = [];

  if (settings.abstractEnabled) {
    if (!settings.abstractStartDate) {
      errors.push(
        'Abstract submission is enabled but abstractStartDate is not set.',
      );
    }
    if (!settings.abstractEndDate) {
      errors.push(
        'Abstract submission is enabled but abstractEndDate is not set.',
      );
    }
    if (
      settings.abstractStartDate &&
      settings.abstractEndDate &&
      settings.abstractStartDate >= settings.abstractEndDate
    ) {
      errors.push('abstractStartDate must be before abstractEndDate.');
    }
  }

  if (settings.registrationEnabled) {
    if (!settings.registrationStartDate) {
      errors.push(
        'Registration is enabled but registrationStartDate is not set.',
      );
    }
    if (!settings.registrationEndDate) {
      errors.push(
        'Registration is enabled but registrationEndDate is not set.',
      );
    }
    if (
      settings.registrationStartDate &&
      settings.registrationEndDate &&
      settings.registrationStartDate >= settings.registrationEndDate
    ) {
      errors.push('registrationStartDate must be before registrationEndDate.');
    }
  }

  return errors;
}
