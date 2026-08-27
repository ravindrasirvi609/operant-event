'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api/client';
import { useRegister } from '@/hooks/use-registrations';
import type { RegistrationCategory } from '@/lib/registrations/types';

/**
 * `GET conferences/:conferenceId/registration-categories` requires
 * `PermissionsGuard` (`REGISTRATION_MANAGE`) — the same organizer-only
 * gate as its `POST`, even though a registrant with no organization
 * membership needs to browse categories to register at all. This is the
 * same category of gap as Phase 2's tracks/form-fields: attempted with
 * `retry: false` and degraded gracefully rather than blocking the page.
 */
export function RegistrationCategoryPicker({ conferenceId }: { conferenceId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const categoriesQuery = useQuery({
    queryKey: ['conferences', conferenceId, 'registration-categories', 'picker'],
    queryFn: () => apiGet<RegistrationCategory[]>(`conferences/${conferenceId}/registration-categories`),
    retry: false,
  });
  const register = useRegister(conferenceId);

  async function handleRegister(categoryId: string) {
    setError(null);
    try {
      const registration = await register.mutateAsync(categoryId);
      router.push(`/registrations/${registration.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register.');
    }
  }

  if (categoriesQuery.isError) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
        Categories can&apos;t be browsed from here right now — ask the organizer for the exact category to register
        for.
      </p>
    );
  }

  if (categoriesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="max-w-xl space-y-4">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {categories.map((category) => (
          <li key={category.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{category.name}</p>
                {category.description ? (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                ) : null}
              </div>
              <Button size="sm" disabled={register.isPending} onClick={() => handleRegister(category.id)}>
                Register
              </Button>
            </div>
            {category.types.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Estimated price — confirmed only after registration:{' '}
                {category.types.map((type) => `${type.name}: ${type.price} ${type.currency}`).join(', ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
