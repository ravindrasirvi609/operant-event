import type { FormFieldStatus, FormFieldType } from './form-field-types';

export interface ConferenceFormField {
  id: string;
  conferenceId: string;
  section: string;
  fieldKey: string;
  label: string;
  fieldType: FormFieldType;
  isRequired: boolean;
  optionsJson: string[] | null;
  validationJson: unknown;
  sortOrder: number;
  status: FormFieldStatus;
}
