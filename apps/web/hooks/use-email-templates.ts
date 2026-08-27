'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '@/lib/api/client';
import type { EmailTemplate } from '@/lib/notifications/types';

function templatesQueryKey(organizationId: string, conferenceId?: string) {
  return ['organizations', organizationId, 'email-templates', conferenceId ?? 'all'];
}

/**
 * With `conferenceId` given, the backend returns BOTH the conference's
 * own override rows AND every org-wide default row in one flat array —
 * distinguish them client-side by `conferenceId === null` (default) vs
 * not (override for a specific conference), matching
 * `EmailTemplatesService.resolve`'s precedence (specific wins).
 */
export function useEmailTemplates(organizationId: string, conferenceId?: string) {
  return useQuery({
    queryKey: templatesQueryKey(organizationId, conferenceId),
    queryFn: () => apiGet<EmailTemplate[]>(`email-templates${conferenceId ? `?conferenceId=${conferenceId}` : ''}`),
    enabled: Boolean(organizationId),
  });
}

export function useUpdateEmailTemplate(organizationId: string, conferenceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, subject, body }: { templateId: string; subject?: string; body?: string }) =>
      apiPut<EmailTemplate>(`email-templates/${templateId}`, { subject, body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templatesQueryKey(organizationId, conferenceId) });
    },
  });
}
