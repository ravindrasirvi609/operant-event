
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmailTemplateEditor } from '@/components/notifications/email-template-editor';
import { AsyncBoundary } from '@/components/query/async-boundary';
import {
  useEmailTemplates,
  useEnsureFeedbackCertificateTemplate,
} from '@/hooks/use-email-templates';
import { useConferences } from '@/hooks/use-conferences';

export function EmailTemplateList({
  organizationId,
}: {
  organizationId: string;
}) {
  const templatesQuery = useEmailTemplates(organizationId);
  const conferencesQuery = useConferences();
  const createTemplate = useEnsureFeedbackCertificateTemplate(organizationId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const conferenceNames = new Map(
    (conferencesQuery.data ?? []).map((conference) => [
      conference.id,
      conference.name,
    ]),
  );

  async function handleCreateDefault() {
    setMessage(null);
    setErrorMessage(null);

    try {
      const result = await createTemplate.mutateAsync(undefined);

      setMessage(
        result.created
          ? 'Default feedback certificate email template created.'
          : 'The default feedback certificate template already exists.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not create the email template. Please try again.',
      );
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Manage email templates</h2>
          <p className="text-sm text-muted-foreground">
            Create the default feedback certificate email or edit existing templates.
          </p>
        </div>

        <Button
          onClick={handleCreateDefault}
          disabled={createTemplate.isPending}
        >
          {createTemplate.isPending
            ? 'Creating...'
            : 'Create Default Template'}
        </Button>
      </div>

      {message ? (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-red-300 p-3 text-sm text-red-700"
        >
          <p>{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateDefault}
            disabled={createTemplate.isPending}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <AsyncBoundary
        query={templatesQuery}
        empty={
          <p className="text-sm text-muted-foreground">
            No email templates configured yet. Use Create Default Template to add one.
          </p>
        }
      >
        {(templates) => {
          const defaults = templates.filter(
            (template) => template.conferenceId === null,
          );

          const overrides = templates.filter(
            (template) => template.conferenceId !== null,
          );

          return (
            <div className="space-y-8">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">
                  Organization-wide defaults
                </h2>

                <ul className="space-y-2">
                  {defaults.map((template) => (
                    <li
                      key={template.id}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm">
                          {template.event}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingId(
                              editingId === template.id
                                ? null
                                : template.id,
                            )
                          }
                        >
                          {editingId === template.id ? 'Close' : 'Edit'}
                        </Button>
                      </div>

                      {editingId === template.id ? (
                        <div className="mt-3">
                          <EmailTemplateEditor
                            organizationId={organizationId}
                            template={template}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}

                  {defaults.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      No organization-wide defaults yet.
                    </li>
                  ) : null}
                </ul>
              </section>

              <section className="space-y-3 border-t pt-6">
                <h2 className="text-sm font-semibold">
                  Conference-specific overrides
                </h2>

                <ul className="space-y-2">
                  {overrides.map((template) => (
                    <li
                      key={template.id}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">
                          <span className="font-mono">
                            {template.event}
                          </span>
                          {' — '}
                          {conferenceNames.get(template.conferenceId ?? '') ??
                            template.conferenceId}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingId(
                              editingId === template.id
                                ? null
                                : template.id,
                            )
                          }
                        >
                          {editingId === template.id ? 'Close' : 'Edit'}
                        </Button>
                      </div>

                      {editingId === template.id ? (
                        <div className="mt-3">
                          <EmailTemplateEditor
                            organizationId={organizationId}
                            conferenceId={template.conferenceId ?? undefined}
                            template={template}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}

                  {overrides.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      No conference-specific overrides.
                    </li>
                  ) : null}
                </ul>
              </section>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
