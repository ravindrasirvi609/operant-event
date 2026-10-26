
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '@/lib/api/client';
import type { EmailTemplate } from '@/lib/notifications/types';

function templatesQueryKey(organizationId: string, conferenceId?: string) {
  return ['organizations', organizationId, 'email-templates', conferenceId ?? 'all'];
}

export function useEmailTemplates(organizationId: string, conferenceId?: string) {
  return useQuery({
    queryKey: templatesQueryKey(organizationId, conferenceId),
    queryFn: () =>
      apiGet<EmailTemplate[]>(
        `email-templates${conferenceId ? `?conferenceId=${encodeURIComponent(conferenceId)}` : ''}`,
      ),
    enabled: Boolean(organizationId),
  });
}

export function useEnsureFeedbackCertificateTemplate(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conferenceId?: string) =>
      apiPost<{
        created: boolean;
        template: EmailTemplate;
      }>('email-templates/feedback-certificate-default', {
        ...(conferenceId ? { conferenceId } : {}),
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'email-templates'],
      });
    },
  });
}

export function useUpdateEmailTemplate(
  organizationId: string,
  conferenceId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      subject,
      body,
    }: {
      templateId: string;
      subject?: string;
      body?: string;
    }) =>
      apiPut<EmailTemplate>(`email-templates/${templateId}`, {
        subject,
        body,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'email-templates'],
      });
    },
  });
}
