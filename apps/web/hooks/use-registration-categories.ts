'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';
import type { RegistrationCategory, RegistrationType } from '@/lib/registrations/types';

function categoriesQueryKey(conferenceId: string) {
  return ['conferences', conferenceId, 'registration-categories'];
}

export function useRegistrationCategories(conferenceId: string) {
  return useQuery({
    queryKey: categoriesQueryKey(conferenceId),
    queryFn: () => apiGet<RegistrationCategory[]>(`conferences/${conferenceId}/registration-categories`),
    enabled: Boolean(conferenceId),
  });
}

export interface CreateRegistrationCategoryInput {
  name: string;
  description?: string;
}

export function useCreateRegistrationCategory(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRegistrationCategoryInput) =>
      apiPost<RegistrationCategory>(`conferences/${conferenceId}/registration-categories`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey(conferenceId) });
    },
  });
}

export interface CreateRegistrationTypeInput {
  name: string;
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  capacity?: number;
}

export function useCreateRegistrationType(conferenceId: string, categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRegistrationTypeInput) =>
      apiPost<RegistrationType>(`registration-categories/${categoryId}/types`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey(conferenceId) });
    },
  });
}
