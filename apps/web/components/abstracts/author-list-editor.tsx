'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import type { AuthorInput } from '@/lib/abstracts/types';
import { validateAuthorFlags } from '@/lib/abstracts/validate-author-flags';

interface AuthorListEditorProps {
  defaultAuthors: AuthorInput[];
  onSave: (authors: AuthorInput[]) => void | Promise<void>;
}

interface AuthorFormValues {
  authors: AuthorInput[];
}

const EMPTY_AUTHOR: AuthorInput = { firstName: '', lastName: '' };

export function AuthorListEditor({ defaultAuthors, onSave }: AuthorListEditorProps) {
  const [flagErrors, setFlagErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { register, control, handleSubmit } = useForm<AuthorFormValues>({
    defaultValues: { authors: defaultAuthors.length > 0 ? defaultAuthors : [EMPTY_AUTHOR] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'authors' });

  async function onSubmit(values: AuthorFormValues) {
    const errors = validateAuthorFlags(values.authors);
    setFlagErrors(errors);
    if (errors.length > 0) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(values.authors);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Author {index + 1}</span>
            {fields.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove author ${index + 1}`}
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" htmlFor={`authors.${index}.firstName`}>
              <Input
                id={`authors.${index}.firstName`}
                data-testid="author-first-name"
                {...register(`authors.${index}.firstName`, { required: true })}
              />
            </FormField>
            <FormField label="Last name" htmlFor={`authors.${index}.lastName`}>
              <Input
                id={`authors.${index}.lastName`}
                data-testid="author-last-name"
                {...register(`authors.${index}.lastName`, { required: true })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email (optional)" htmlFor={`authors.${index}.email`}>
              <Input id={`authors.${index}.email`} type="email" {...register(`authors.${index}.email`)} />
            </FormField>
            <FormField label="Institution (optional)" htmlFor={`authors.${index}.institution`}>
              <Input id={`authors.${index}.institution`} {...register(`authors.${index}.institution`)} />
            </FormField>
          </div>
          <div className="flex gap-4">
            <label htmlFor={`authors.${index}.isPresenting`} className="flex items-center gap-2 text-sm">
              <input
                id={`authors.${index}.isPresenting`}
                type="checkbox"
                className="size-4 rounded border-input"
                {...register(`authors.${index}.isPresenting`)}
              />
              Presenting author
            </label>
            <label htmlFor={`authors.${index}.isCorresponding`} className="flex items-center gap-2 text-sm">
              <input
                id={`authors.${index}.isCorresponding`}
                type="checkbox"
                className="size-4 rounded border-input"
                {...register(`authors.${index}.isCorresponding`)}
              />
              Corresponding author
            </label>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={() => append(EMPTY_AUTHOR)}>
        Add author
      </Button>

      {flagErrors.length > 0 ? (
        <div role="alert" className="space-y-1 text-sm text-destructive">
          {flagErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save authors'}
      </Button>
    </form>
  );
}
