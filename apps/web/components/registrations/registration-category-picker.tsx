'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { apiGet } from '@/lib/api/client';
import { useRegister } from '@/hooks/use-registrations';
import type { RegistrationCategory } from '@/lib/registrations/types';

/**
 * Uses the `JwtAuthGuard`-only `.../registration-options` route — not
 * the organizer-facing `.../registration-categories` route, which
 * requires `REGISTRATION_MANAGE` and an active organization membership
 * a registrant doesn't have.
 */
export function RegistrationCategoryPicker({ conferenceId }: { conferenceId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const categoriesQuery = useQuery({
    queryKey: ['conferences', conferenceId, 'registration-options'],
    queryFn: () => apiGet<RegistrationCategory[]>(`conferences/${conferenceId}/registration-options`),
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

  return (
    <div className="max-w-xl space-y-4">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <AsyncBoundary
        query={categoriesQuery}
        empty={<p className="text-sm text-muted-foreground">No registration categories are open yet.</p>}
      >
        {(categories) => (
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
        )}
      </AsyncBoundary>
    </div>
  );
}
