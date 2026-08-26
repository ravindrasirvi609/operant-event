'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useInviteMember } from '@/hooks/use-members';
import { useRoles } from '@/hooks/use-roles';
import { AsyncBoundary } from '@/components/query/async-boundary';

// Mirrors apps/api/src/organizations/dto/invite-member.dto.ts exactly.
const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  firstName: z.string().min(1, 'Enter a first name.'),
  lastName: z.string().min(1, 'Enter a last name.'),
  roleIds: z.array(z.string()).min(1, 'Select at least one role.'),
});

type InviteValues = z.infer<typeof inviteSchema>;

export function MembersInvitePanel({ organizationId }: { organizationId: string }) {
  const rolesQuery = useRoles(organizationId);
  const inviteMember = useInviteMember(organizationId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { roleIds: [] } });
  const selectedRoleIds = watch('roleIds');

  async function onSubmit(values: InviteValues) {
    setSubmitError(null);
    try {
      await inviteMember.mutateAsync(values);
      setInvited(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Invitation failed.');
    }
  }

  function toggleRole(roleId: string, checked: boolean) {
    setValue('roleIds', checked ? [...selectedRoleIds, roleId] : selectedRoleIds.filter((id) => id !== roleId), {
      shouldValidate: true,
    });
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
        There is currently no way to list existing members — the backend has
        no endpoint for it yet. You can invite new members below; changing an
        existing member&apos;s role or status isn&apos;t reachable from this
        UI until that endpoint exists.
      </div>
      {invited ? (
        <p className="text-sm text-muted-foreground" role="status">
          Invitation sent. The new member will receive an email with a link to set their password.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" htmlFor="invite-first-name" error={errors.firstName?.message}>
              <Input id="invite-first-name" {...register('firstName')} />
            </FormField>
            <FormField label="Last name" htmlFor="invite-last-name" error={errors.lastName?.message}>
              <Input id="invite-last-name" {...register('lastName')} />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="invite-email" error={errors.email?.message}>
            <Input id="invite-email" type="email" {...register('email')} />
          </FormField>
          <div className="space-y-2">
            <span className="text-sm font-medium">Roles</span>
            {errors.roleIds ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.roleIds.message}
              </p>
            ) : null}
            <AsyncBoundary query={rolesQuery} empty={<p className="text-sm text-muted-foreground">No roles exist yet.</p>}>
              {(roles) => (
                <div className="space-y-1.5">
                  {roles.map((role) => (
                    <label key={role.id} htmlFor={`invite-role-${role.id}`} className="flex items-center gap-2 text-sm">
                      <input
                        id={`invite-role-${role.id}`}
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={(event) => toggleRole(role.id, event.target.checked)}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              )}
            </AsyncBoundary>
          </div>
          {submitError ? (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending invitation…' : 'Send invitation'}
          </Button>
        </form>
      )}
    </div>
  );
}
