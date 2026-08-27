'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { TemplatePreview } from '@/components/notifications/template-preview';
import { useUpdateEmailTemplate } from '@/hooks/use-email-templates';
import type { EmailTemplate } from '@/lib/notifications/types';

export function EmailTemplateEditor({
  organizationId,
  conferenceId,
  template,
}: {
  organizationId: string;
  conferenceId?: string;
  template: EmailTemplate;
}) {
  const updateTemplate = useUpdateEmailTemplate(organizationId, conferenceId);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaved(false);
    await updateTemplate.mutateAsync({ templateId: template.id, subject, body });
    setSaved(true);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-3">
        <FormField label="Subject" htmlFor={`template-subject-${template.id}`}>
          <Input id={`template-subject-${template.id}`} value={subject} onChange={(event) => setSubject(event.target.value)} />
        </FormField>
        <FormField label="Body" htmlFor={`template-body-${template.id}`}>
          <textarea
            id={`template-body-${template.id}`}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
            rows={8}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </FormField>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={updateTemplate.isPending} onClick={handleSave}>
            {updateTemplate.isPending ? 'Saving…' : 'Save'}
          </Button>
          {saved ? <span className="text-sm text-muted-foreground">Saved.</span> : null}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Preview</p>
        <TemplatePreview text={subject} />
        <TemplatePreview text={body} />
      </div>
    </div>
  );
}
