'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '@/lib/api/client';
import type { Abstract, AuthorInput, SubmissionType } from '@/lib/abstracts/types';

const MY_ABSTRACTS_QUERY_KEY = ['abstracts', 'mine'];

export function useMyAbstracts() {
  return useQuery({
    queryKey: MY_ABSTRACTS_QUERY_KEY,
    queryFn: () => apiGet<Abstract[]>('abstracts/mine'),
  });
}

/**
 * No `GET abstracts/:id` endpoint exists for authors — the only source
 * of a single abstract's bare row is the `abstracts/mine` list. Note this
 * gives you the `Abstract` row only: there is no endpoint anywhere that
 * returns a saved `AbstractVersion.formData` or the abstract's current
 * author list back to the client once written — see
 * `docs/plans/frontend/02-abstract-submission.md`'s gap notes.
 */
export function useMyAbstract(abstractId: string) {
  return useQuery({
    queryKey: MY_ABSTRACTS_QUERY_KEY,
    queryFn: () => apiGet<Abstract[]>('abstracts/mine'),
    select: (abstracts) => abstracts.find((abstract) => abstract.id === abstractId),
  });
}

export interface CreateAbstractDraftInput {
  title: string;
  submissionType: SubmissionType;
  presentationPreference?: string;
  trackId?: string;
}

export function useCreateAbstractDraft(conferenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAbstractDraftInput) =>
      apiPost<Abstract>(`conferences/${conferenceId}/abstracts`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_ABSTRACTS_QUERY_KEY });
    },
  });
}

export interface SaveAbstractVersionInput {
  title?: string;
  submissionType?: SubmissionType;
  presentationPreference?: string;
  trackId?: string;
  formData: Record<string, unknown>;
}

export function useSaveAbstractVersion(abstractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveAbstractVersionInput) => apiPut<Abstract>(`abstracts/${abstractId}/versions`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_ABSTRACTS_QUERY_KEY });
    },
  });
}

export function useSubmitAbstract(abstractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<Abstract>(`abstracts/${abstractId}/submit`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_ABSTRACTS_QUERY_KEY });
    },
  });
}

export function useWithdrawAbstract(abstractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<Abstract>(`abstracts/${abstractId}/withdraw`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_ABSTRACTS_QUERY_KEY });
    },
  });
}

export function useSetAbstractAuthors(abstractId: string) {
  return useMutation({
    mutationFn: (authors: AuthorInput[]) => apiPut(`abstracts/${abstractId}/authors`, { authors }),
  });
}
