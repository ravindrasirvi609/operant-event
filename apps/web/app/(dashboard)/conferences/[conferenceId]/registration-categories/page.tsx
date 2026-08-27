'use client';

import { use } from 'react';
import { RegistrationCategoryList } from '@/components/registrations/registration-category-list';

export default function RegistrationCategoriesPage({
  params,
}: {
  params: Promise<{ conferenceId: string }>;
}) {
  const { conferenceId } = use(params);
  return <RegistrationCategoryList conferenceId={conferenceId} />;
}
