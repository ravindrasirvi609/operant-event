'use client';

import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api/client';
import type { DecisionType } from '@/lib/reviewers/types';

export function useRecordDecision(abstractId: string) {
  return useMutation({
    mutationFn: (input: { decision: DecisionType; reason?: string }) =>
      apiPost(`abstracts/${abstractId}/decision`, input),
  });
}

export function useRequestRevision(abstractId: string) {
  return useMutation({
    mutationFn: (input: { reason: string; dueDate?: string }) =>
      apiPost(`abstracts/${abstractId}/request-revision`, input),
  });
}
