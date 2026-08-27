'use client';

import { use } from 'react';
import { RegistrationCategoryPicker } from '@/components/registrations/registration-category-picker';

export default function RegisterPage({ params }: { params: Promise<{ conferenceId: string }> }) {
  const { conferenceId } = use(params);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Register</h1>
      <RegistrationCategoryPicker conferenceId={conferenceId} />
    </div>
  );
}
