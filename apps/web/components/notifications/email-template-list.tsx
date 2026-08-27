'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmailTemplateEditor } from '@/components/notifications/email-template-editor';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useEmailTemplates } from '@/hooks/use-email-templates';
import { useConferences } from '@/hooks/use-conferences';

/**
 * Two distinct sections, matching `EmailTemplatesService.resolve`'s
 * precedence exactly: organization-wide defaults (`conferenceId ===
 * null`) and conference-specific overrides — never a single
 * undifferentiated list, since a reader must be able to see which row
 * actually wins for a given conference.
 */
export function EmailTemplateList({ organizationId }: { organizationId: string }) {
  const templatesQuery = useEmailTemplates(organizationId);
  const conferencesQuery = useConferences();
  const [editingId, setEditingId] = useState<string | null>(null);

  const conferenceNames = new Map((conferencesQuery.data ?? []).map((conference) => [conference.id, conference.name]));

  return (
    <AsyncBoundary
      query={templatesQuery}
      empty={<p className="text-sm text-muted-foreground">No email templates configured yet.</p>}
    >
      {(templates) => {
        const defaults = templates.filter((t) => t.conferenceId === null);
        const overrides = templates.filter((t) => t.conferenceId !== null);
        return (
          <div className="max-w-3xl space-y-8">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Organization-wide defaults</h2>
              <ul className="space-y-2">
                {defaults.map((template) => (
                  <li key={template.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{template.event}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(editingId === template.id ? null : template.id)}
                      >
                        {editingId === template.id ? 'Close' : 'Edit'}
                      </Button>
                    </div>
                    {editingId === template.id ? (
                      <div className="mt-3">
                        <EmailTemplateEditor organizationId={organizationId} template={template} />
                      </div>
                    ) : null}
                  </li>
                ))}
                {defaults.length === 0 ? <li className="text-sm text-muted-foreground">None yet.</li> : null}
              </ul>
            </section>

            <section className="space-y-3 border-t pt-6">
              <h2 className="text-sm font-semibold">Conference-specific overrides</h2>
              <ul className="space-y-2">
                {overrides.map((template) => (
                  <li key={template.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        <span className="font-mono">{template.event}</span> —{' '}
                        {conferenceNames.get(template.conferenceId ?? '') ?? template.conferenceId}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(editingId === template.id ? null : template.id)}
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
                  <li className="text-sm text-muted-foreground">No conference-specific overrides.</li>
                ) : null}
              </ul>
            </section>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
