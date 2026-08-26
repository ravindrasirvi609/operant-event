'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField as FormFieldWrapper } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AsyncBoundary } from '@/components/query/async-boundary';
import { useCreateFormField, useFormFields, useUpdateFormField } from '@/hooks/use-form-fields';
import { fieldTypeHasOptions, FORM_FIELD_TYPES, type FormFieldType } from '@/lib/conferences/form-field-types';

// Mirrors apps/api/src/conference-form-fields/dto/create-form-field.dto.ts.
const formFieldSchema = z.object({
  section: z.string().min(1, 'Enter a section name.'),
  fieldKey: z
    .string()
    .min(1, 'Enter a field key.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers, and underscores.'),
  label: z.string().min(1, 'Enter a label.'),
  fieldType: z.enum(FORM_FIELD_TYPES),
  isRequired: z.boolean(),
  optionsCsv: z.string().optional(),
});

type FormFieldFormValues = z.infer<typeof formFieldSchema>;

export function FormFieldBuilder({ conferenceId }: { conferenceId: string }) {
  const fieldsQuery = useFormFields(conferenceId);
  const createField = useCreateFormField(conferenceId);
  const updateField = useUpdateFormField(conferenceId);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormFieldFormValues>({
    resolver: zodResolver(formFieldSchema),
    defaultValues: { fieldType: 'TEXT', isRequired: false, section: 'General' },
  });
  const fieldType = watch('fieldType');

  async function onCreate(values: FormFieldFormValues) {
    const optionsJson = fieldTypeHasOptions(values.fieldType)
      ? values.optionsCsv
          ?.split(',')
          .map((option) => option.trim())
          .filter(Boolean)
      : undefined;
    await createField.mutateAsync({
      section: values.section,
      fieldKey: values.fieldKey,
      label: values.label,
      fieldType: values.fieldType,
      isRequired: values.isRequired,
      optionsJson,
    });
    reset({ fieldType: 'TEXT', isRequired: false, section: values.section, fieldKey: '', label: '', optionsCsv: '' });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <AsyncBoundary
        query={fieldsQuery}
        empty={<p className="text-sm text-muted-foreground">No custom fields yet.</p>}
      >
        {(fields) => (
          <ul className="divide-y rounded-lg border">
            {fields.map((field) => (
              <li key={field.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">
                    {field.label} {field.isRequired ? <span className="text-destructive">*</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {field.section} · {field.fieldType} · {field.fieldKey}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={field.status === 'ACTIVE' ? 'default' : 'outline'}>{field.status}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateField.isPending}
                    onClick={() =>
                      updateField.mutate({
                        fieldId: field.id,
                        input: { status: field.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
                      })
                    }
                  >
                    {field.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>

      <form onSubmit={handleSubmit(onCreate)} className="space-y-3 border-t pt-4" noValidate>
        <h2 className="text-sm font-semibold">Add a custom field</h2>
        <div className="grid grid-cols-2 gap-3">
          <FormFieldWrapper label="Section" htmlFor="field-section" error={errors.section?.message}>
            <Input id="field-section" {...register('section')} />
          </FormFieldWrapper>
          <FormFieldWrapper label="Field key" htmlFor="field-key" error={errors.fieldKey?.message}>
            <Input id="field-key" placeholder="e.g. background" {...register('fieldKey')} />
          </FormFieldWrapper>
        </div>
        <FormFieldWrapper label="Label" htmlFor="field-label" error={errors.label?.message}>
          <Input id="field-label" {...register('label')} />
        </FormFieldWrapper>
        <FormFieldWrapper label="Field type" htmlFor="field-type" error={errors.fieldType?.message}>
          <Select
            value={fieldType}
            onValueChange={(value) => value && setValue('fieldType', value as FormFieldType, { shouldValidate: true })}
          >
            <SelectTrigger id="field-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORM_FIELD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormFieldWrapper>
        {fieldTypeHasOptions(fieldType) ? (
          <FormFieldWrapper label="Options (comma-separated)" htmlFor="field-options" error={errors.optionsCsv?.message}>
            <Input id="field-options" placeholder="Option A, Option B, Option C" {...register('optionsCsv')} />
          </FormFieldWrapper>
        ) : null}
        <label htmlFor="field-required" className="flex items-center gap-2 text-sm">
          <input id="field-required" type="checkbox" className="size-4 rounded border-input" {...register('isRequired')} />
          Required
        </label>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add field'}
        </Button>
      </form>
    </div>
  );
}
