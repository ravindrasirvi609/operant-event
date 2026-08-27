'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { RegistrationCategoryForm } from '@/components/registrations/registration-category-form';
import { RegistrationTypeForm } from '@/components/registrations/registration-type-form';
import { useRegistrationCategories } from '@/hooks/use-registration-categories';

export function RegistrationCategoryList({ conferenceId }: { conferenceId: string }) {
  const categoriesQuery = useRegistrationCategories(conferenceId);
  const [addingTypeFor, setAddingTypeFor] = useState<string | null>(null);

  return (
    <div className="max-w-2xl space-y-6">
      <AsyncBoundary
        query={categoriesQuery}
        empty={<p className="text-sm text-muted-foreground">No registration categories yet.</p>}
      >
        {(categories) => (
          <ul className="space-y-4">
            {categories.map((category) => (
              <li key={category.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {category.description ? (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingTypeFor(addingTypeFor === category.id ? null : category.id)}
                  >
                    Add pricing window
                  </Button>
                </div>
                {category.types.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1">Name</th>
                        <th className="py-1">Price</th>
                        <th className="py-1">Window</th>
                        <th className="py-1">Capacity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.types.map((type) => (
                        <tr key={type.id} className="border-t">
                          <td className="py-1">{type.name}</td>
                          <td className="py-1">
                            {type.price} {type.currency}
                          </td>
                          <td className="py-1">
                            {new Date(type.startDate).toLocaleDateString()} –{' '}
                            {new Date(type.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-1">{type.capacity ?? 'Unlimited'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground">No pricing windows configured yet.</p>
                )}
                {addingTypeFor === category.id ? (
                  <RegistrationTypeForm conferenceId={conferenceId} categoryId={category.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
      <RegistrationCategoryForm conferenceId={conferenceId} />
    </div>
  );
}
