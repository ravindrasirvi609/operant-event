'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import {
  FormField as FormFieldWrapper,
} from '@/components/ui/form-field';

import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { AsyncBoundary } from '@/components/query/async-boundary';

import {
  useCreateFormField,
  useFormFields,
  useUpdateFormField,
} from '@/hooks/use-form-fields';

import {
  fieldTypeHasOptions,
  FORM_FIELD_TYPES,
  type FormFieldType,
} from '@/lib/conferences/form-field-types';


/* -------------------------------------------------------------------------- */
/* Form schema                                                               */
/* -------------------------------------------------------------------------- */

const formFieldSchema = z.object({
  section: z
    .string()
    .min(1, 'Enter a section name.'),

  fieldKey: z
    .string()
    .min(1, 'Enter a field key.')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Use only letters, numbers, and underscores.',
    ),

  label: z
    .string()
    .min(1, 'Enter a label.'),

  fieldType: z.enum(
    FORM_FIELD_TYPES,
  ),

  isRequired: z.boolean(),

  optionsCsv:
    z.string().optional(),
});


type FormFieldFormValues =
  z.infer<
    typeof formFieldSchema
  >;


/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function FormFieldBuilder({
  conferenceId,
}: {
  conferenceId: string;
}) {
  const fieldsQuery =
    useFormFields(conferenceId);

  const createField =
    useCreateFormField(
      conferenceId,
    );

  const updateField =
    useUpdateFormField(
      conferenceId,
    );


  /* ------------------------------------------------------------------------ */
  /* Edit state                                                               */
  /* ------------------------------------------------------------------------ */

  const [
    editingFieldId,
    setEditingFieldId,
  ] = useState<string | null>(
    null,
  );


  /* ------------------------------------------------------------------------ */
  /* React Hook Form                                                          */
  /* ------------------------------------------------------------------------ */

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<FormFieldFormValues>({
    resolver:
      zodResolver(
        formFieldSchema,
      ),

    defaultValues: {
      section: '',
      fieldKey: '',
      label: '',
      fieldType: 'TEXT',
      isRequired: false,
      optionsCsv: '',
    },
  });


  const fieldType =
    watch('fieldType');


  /* ------------------------------------------------------------------------ */
  /* Default form reset                                                       */
  /* ------------------------------------------------------------------------ */

  function resetCreateForm() {
    reset({
      section: '',
      fieldKey: '',
      label: '',
      fieldType: 'TEXT',
      isRequired: false,
      optionsCsv: '',
    });
  }


  /* ------------------------------------------------------------------------ */
  /* Convert options string -> array                                          */
  /* ------------------------------------------------------------------------ */

  function getOptionsJson(
    values: FormFieldFormValues,
  ): string[] | undefined {
    if (
      !fieldTypeHasOptions(
        values.fieldType,
      )
    ) {
      return undefined;
    }

    return (
      values.optionsCsv
        ?.split(',')
        .map(
          (option) =>
            option.trim(),
        )
        .filter(Boolean)
    );
  }


  /* ------------------------------------------------------------------------ */
  /* Create field                                                             */
  /* ------------------------------------------------------------------------ */

  async function onCreate(
    values: FormFieldFormValues,
  ) {
    const optionsJson =
      getOptionsJson(values);


    await createField.mutateAsync({
      section:
        values.section.trim(),

      fieldKey:
        values.fieldKey.trim(),

      label:
        values.label.trim(),

      fieldType:
        values.fieldType,

      isRequired:
        values.isRequired,

      optionsJson,
    });


    /*
     * After successful creation,
     * completely clear the form.
     */
    resetCreateForm();
  }


  /* ------------------------------------------------------------------------ */
  /* Start editing                                                            */
  /* ------------------------------------------------------------------------ */

  function startEditing(field: {
    id: string;
    section: string;
    fieldKey: string;
    label: string;
    fieldType: FormFieldType;
    isRequired: boolean;
    optionsJson?: unknown;
  }) {
    let options: string[] = [];


    if (
      Array.isArray(
        field.optionsJson,
      )
    ) {
      options =
        field.optionsJson.filter(
          (
            option,
          ): option is string =>
            typeof option ===
            'string',
        );
    }


    setEditingFieldId(
      field.id,
    );


    /*
     * Populate edit form with
     * CURRENT database values.
     */
    reset({
      section:
        field.section,

      fieldKey:
        field.fieldKey,

      label:
        field.label,

      fieldType:
        field.fieldType,

      isRequired:
        field.isRequired,

      optionsCsv:
        options.join(', '),
    });
  }


  /* ------------------------------------------------------------------------ */
  /* Cancel editing                                                           */
  /* ------------------------------------------------------------------------ */

  function cancelEditing() {
    setEditingFieldId(
      null,
    );

    resetCreateForm();
  }


  /* ------------------------------------------------------------------------ */
  /* Save edited field                                                        */
  /* ------------------------------------------------------------------------ */

  async function onEdit(
    values: FormFieldFormValues,
  ) {
    if (!editingFieldId) {
      return;
    }


    const fieldId =
      editingFieldId;


    const optionsJson =
      getOptionsJson(values);


    /*
     * Send only editable properties.
     *
     * Section and Field Key are intentionally
     * NOT sent and therefore cannot be changed.
     */
    await updateField.mutateAsync({
      fieldId,

      input: {
        label:
          values.label.trim(),

        fieldType:
          values.fieldType,

        isRequired:
          values.isRequired,

        optionsJson:
          optionsJson ?? [],
      },
    });


    /*
     * Force fresh data from backend.
     *
     * This ensures the updated value immediately
     * appears in the field list.
     */
    await fieldsQuery.refetch();


    /*
     * Exit edit mode only AFTER the
     * latest data has been loaded.
     */
    setEditingFieldId(
      null,
    );

    resetCreateForm();
  }


  /* ------------------------------------------------------------------------ */
  /* Busy state                                                               */
  /* ------------------------------------------------------------------------ */

  const isBusy =
    isSubmitting ||
    createField.isPending ||
    updateField.isPending;


  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="max-w-2xl space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* Existing fields                                                    */}
      {/* ------------------------------------------------------------------ */}

      <AsyncBoundary
        query={fieldsQuery}
        empty={
          <p className="text-sm text-muted-foreground">
            No custom fields yet.
          </p>
        }
      >
        {(fields) => (
          <ul className="divide-y rounded-lg border">

            {fields.map(
              (field) => (
                <li
                  key={field.id}
                  className="flex items-center justify-between gap-3 p-3"
                >

                  {/* ------------------------------------------------------ */}
                  {/* Field information                                      */}
                  {/* ------------------------------------------------------ */}

                  <div className="min-w-0">

                    <p className="text-sm font-medium">
                      {field.label}{' '}

                      {field.isRequired ? (
                        <span className="text-destructive">
                          *
                        </span>
                      ) : null}
                    </p>


                    <p className="text-xs text-muted-foreground">
                      {field.section}
                      {' · '}
                      {field.fieldType}
                      {' · '}
                      {field.fieldKey}
                    </p>

                  </div>


                  {/* ------------------------------------------------------ */}
                  {/* Actions                                                 */}
                  {/* ------------------------------------------------------ */}

                  <div className="flex shrink-0 items-center gap-2">

                    <Badge
                      variant={
                        field.status ===
                        'ACTIVE'
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {field.status}
                    </Badge>


                    {/* Edit */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() =>
                        startEditing({
                          id: field.id,
                          section:
                            field.section,
                          fieldKey:
                            field.fieldKey,
                          label:
                            field.label,
                          fieldType:
                            field.fieldType,
                          isRequired:
                            field.isRequired,
                          optionsJson:
                            field.optionsJson,
                        })
                      }
                    >
                      Edit
                    </Button>


                    {/* Enable / Disable */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={async () => {
                        await updateField.mutateAsync({
                          fieldId:
                            field.id,

                          input: {
                            status:
                              field.status ===
                              'ACTIVE'
                                ? 'DISABLED'
                                : 'ACTIVE',
                          },
                        });

                        await fieldsQuery.refetch();
                      }}
                    >
                      {field.status ===
                      'ACTIVE'
                        ? 'Disable'
                        : 'Enable'}
                    </Button>

                  </div>

                </li>
              ),
            )}

          </ul>
        )}
      </AsyncBoundary>


      {/* ------------------------------------------------------------------ */}
      {/* Add / Edit form                                                    */}
      {/* ------------------------------------------------------------------ */}

      <form
        onSubmit={handleSubmit(
          editingFieldId
            ? onEdit
            : onCreate,
        )}
        className="space-y-3 border-t pt-4"
        noValidate
      >

        {/* -------------------------------------------------------------- */}
        {/* Form header                                                     */}
        {/* -------------------------------------------------------------- */}

        <div className="flex items-center justify-between">

          <h2 className="text-sm font-semibold">
            {editingFieldId
              ? 'Edit custom field'
              : 'Add a custom field'}
          </h2>


          {editingFieldId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={
                cancelEditing
              }
              disabled={isBusy}
            >
              Cancel
            </Button>
          ) : null}

        </div>


        {/* -------------------------------------------------------------- */}
        {/* Section + Field Key                                             */}
        {/* -------------------------------------------------------------- */}

        <div className="grid grid-cols-2 gap-3">

          {/* Section */}
          <FormFieldWrapper
            label="Section"
            htmlFor="field-section"
            error={
              errors.section?.message
            }
          >
            <Input
              id="field-section"

              /*
               * Section cannot be changed
               * while editing.
               */
              disabled={
                Boolean(
                  editingFieldId,
                )
              }

              placeholder="e.g. General"

              {...register(
                'section',
              )}
            />
          </FormFieldWrapper>


          {/* Field Key */}
          <FormFieldWrapper
            label="Field key"
            htmlFor="field-key"
            error={
              errors.fieldKey?.message
            }
          >
            <Input
              id="field-key"

              /*
               * Field key cannot be changed
               * because it identifies stored
               * submission data.
               */
              disabled={
                Boolean(
                  editingFieldId,
                )
              }

              placeholder="e.g. background"

              {...register(
                'fieldKey',
              )}
            />
          </FormFieldWrapper>

        </div>


        {/* -------------------------------------------------------------- */}
        {/* Label                                                           */}
        {/* -------------------------------------------------------------- */}

        <FormFieldWrapper
          label="Label"
          htmlFor="field-label"
          error={
            errors.label?.message
          }
        >
          <Input
            id="field-label"
            {...register('label')}
          />
        </FormFieldWrapper>


        {/* -------------------------------------------------------------- */}
        {/* Field Type                                                      */}
        {/* -------------------------------------------------------------- */}

        <FormFieldWrapper
          label="Field type"
          htmlFor="field-type"
          error={
            errors.fieldType?.message
          }
        >
          <Select
            value={fieldType}
            onValueChange={(value) =>
              value &&
              setValue(
                'fieldType',
                value as FormFieldType,
                {
                  shouldValidate:
                    true,
                  shouldDirty:
                    true,
                },
              )
            }
          >

            <SelectTrigger
              id="field-type"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>


            <SelectContent>

              {FORM_FIELD_TYPES.map(
                (type) => (
                  <SelectItem
                    key={type}
                    value={type}
                  >
                    {type}
                  </SelectItem>
                ),
              )}

            </SelectContent>

          </Select>
        </FormFieldWrapper>


        {/* -------------------------------------------------------------- */}
        {/* Options                                                         */}
        {/* -------------------------------------------------------------- */}

        {fieldTypeHasOptions(
          fieldType,
        ) ? (
          <FormFieldWrapper
            label="Options (comma-separated)"
            htmlFor="field-options"
            error={
              errors.optionsCsv
                ?.message
            }
          >
            <Input
              id="field-options"
              placeholder="Option A, Option B, Option C"
              {...register(
                'optionsCsv',
              )}
            />
          </FormFieldWrapper>
        ) : null}


        {/* -------------------------------------------------------------- */}
        {/* Required                                                        */}
        {/* -------------------------------------------------------------- */}

        <label
          htmlFor="field-required"
          className="flex items-center gap-2 text-sm"
        >
          <input
            id="field-required"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register(
              'isRequired',
            )}
          />

          Required
        </label>


        {/* -------------------------------------------------------------- */}
        {/* Save / Add button                                               */}
        {/* -------------------------------------------------------------- */}

        <Button
          type="submit"
          disabled={isBusy}
        >
          {isBusy
            ? editingFieldId
              ? 'Saving…'
              : 'Adding…'
            : editingFieldId
              ? 'Save changes'
              : 'Add field'}
        </Button>

      </form>

    </div>
  );
}