'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { groupPermissionsByModule } from '@/lib/api/group-permissions';
import type { PermissionKey } from '@/lib/api/permissions';

const roleSchema = z.object({
  name: z.string().min(1, 'Enter a role name.'),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'Select at least one permission.'),
});

export type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleEditorProps {
  onSubmit: (values: { name: string; description?: string; permissions: PermissionKey[] }) => Promise<void>;
}

/**
 * Create-only — apps/api has no role-update endpoint (`RolesController`
 * exposes `POST` only; `GET organizations/:id/roles` doesn't even include
 * a role's permission list), so there is nothing to edit against yet.
 */
export function RoleEditor({ onSubmit }: RoleEditorProps) {
  const groups = groupPermissionsByModule();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { permissions: [] },
  });
  const selectedPermissions = watch('permissions');

  function togglePermission(key: string, checked: boolean) {
    const next = checked ? [...selectedPermissions, key] : selectedPermissions.filter((p) => p !== key);
    setValue('permissions', next, { shouldValidate: true });
  }

  async function handleFormSubmit(values: RoleFormValues) {
    await onSubmit({
      name: values.name,
      description: values.description,
      permissions: values.permissions as PermissionKey[],
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="max-w-2xl space-y-4" noValidate>
      <FormField label="Role name" htmlFor="role-name" error={errors.name?.message}>
        <Input id="role-name" {...register('name')} />
      </FormField>
      <FormField label="Description (optional)" htmlFor="role-description" error={errors.description?.message}>
        <Input id="role-description" {...register('description')} />
      </FormField>
      <div className="space-y-3">
        <span className="text-sm font-medium">Permissions</span>
        {errors.permissions ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.permissions.message}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(groups).map(([module, keys]) => (
            <fieldset key={module} className="space-y-1.5 rounded-lg border p-3">
              <legend className="px-1 text-xs font-medium uppercase text-muted-foreground">{module}</legend>
              {keys.map((key) => (
                <label key={key} htmlFor={`permission-${key}`} className="flex items-center gap-2 text-sm">
                  <input
                    id={`permission-${key}`}
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={selectedPermissions.includes(key)}
                    onChange={(event) => togglePermission(key, event.target.checked)}
                  />
                  {key}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating role…' : 'Create role'}
      </Button>
    </form>
  );
}
