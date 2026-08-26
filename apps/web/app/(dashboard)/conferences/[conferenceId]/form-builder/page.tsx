'use client';

import { use } from 'react';
import { FormFieldBuilder } from '@/components/conferences/form-field-builder';

export default function ConferenceFormBuilderPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);

  return <FormFieldBuilder conferenceId={conferenceId} />;
}
