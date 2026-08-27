'use client';

import { use } from 'react';
import { EmailTemplateList } from '@/components/notifications/email-template-list';

export default function EmailTemplatesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Email templates</h1>
      <EmailTemplateList organizationId={orgId} />
    </div>
  );
}
