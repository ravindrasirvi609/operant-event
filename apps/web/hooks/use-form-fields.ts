'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { ConferenceFormField } from '@/lib/conferences/form-field.types';
import type { FormFieldStatus, FormFieldType } from '@/lib/conferences/form-field-types';

function formFieldsQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'form-fields'];
}

export function useFormFields(conferenceId: string) {
  return useQuery({
    queryKey: formFieldsQueryKey(conferenceId),
    queryFn: () => apiGet<ConferenceFormField[]>(`conferences/${conferenceId}/form-fields`),
    enabled: Boolean(conferenceId),
  });
}

export interface CreateFormFieldInput {
  section: string;
  fieldKey: string;
  label: string;
  fieldType: FormFieldType;
  isRequired?: boolean;
  optionsJson?: string[];
}

export function useCreateFormField(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormFieldInput) =>
      apiPost<ConferenceFormField>(`conferences/${conferenceId}/form-fields`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: formFieldsQueryKey(conferenceId) });
    },
  });
}

export interface UpdateFormFieldInput {
  label?: string;
  isRequired?: boolean;
  optionsJson?: string[];
  sortOrder?: number;
  status?: FormFieldStatus;
}

export function useUpdateFormField(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, input }: { fieldId: string; input: UpdateFormFieldInput }) =>
      apiPatch<ConferenceFormField>(`conferences/${conferenceId}/form-fields/${fieldId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: formFieldsQueryKey(conferenceId) });
    },
  });
}
