'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthorListEditor } from '@/components/abstracts/author-list-editor';
import {
  SaveIndicator,
  type SaveState,
} from '@/components/abstracts/save-indicator';
import { SubmissionProgress } from '@/components/abstracts/submission-progress';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useCreateAbstractDraft,
  useSaveAbstractVersion,
  useSetAbstractAuthors,
  useSubmitAbstract,
} from '@/hooks/use-abstracts';

import { DynamicFormField } from '@/lib/forms/dynamic-field-renderer';

import { apiGet } from '@/lib/api/client';

import { uploadFile } from '@/lib/api/upload-file';

import {
  SUBMISSION_TYPES,
  type AuthorInput,
  type SubmissionType,
} from '@/lib/abstracts/types';

import type { ConferenceFormField } from '@/lib/conferences/form-field.types';

import type { ConferenceTrack } from '@/lib/conferences/types';


/* -------------------------------------------------------------------------- */
/* Basics form                                                                */
/* -------------------------------------------------------------------------- */

const basicsSchema = z.object({
  title: z
    .string()
    .min(1, 'Enter a title.'),

  submissionType: z.enum(
    SUBMISSION_TYPES,
  ),

  trackId: z
    .string()
    .optional(),

  presentationPreference: z
    .string()
    .optional(),
});

type BasicsValues =
  z.infer<typeof basicsSchema>;


/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

interface AbstractWizardProps {
  conferenceId: string;

  /**
   * Resume mode: an existing
   * DRAFT / REVISION_REQUIRED abstract.
   */
  existingAbstractId?: string;

  existingBasics?: Partial<BasicsValues>;
}


/**
 * Abstract submission wizard.
 *
 * Uses the JwtAuthGuard-only submission routes.
 *
 * Organizer-facing routes are intentionally NOT used here because
 * authors do not necessarily have organization membership.
 */
export function AbstractWizard({
  conferenceId,
  existingAbstractId,
  existingBasics,
}: AbstractWizardProps) {
  const router = useRouter();


  /* ------------------------------------------------------------------------ */
  /* Wizard state                                                             */
  /* ------------------------------------------------------------------------ */

  const [step, setStep] =
    useState(0);

  const [abstractId, setAbstractId] =
    useState<string | undefined>(
      existingAbstractId,
    );

  const [formData, setFormData] =
    useState<Record<string, unknown>>(
      {},
    );

  const [authors, setAuthors] =
    useState<AuthorInput[]>([]);

  const [saveState, setSaveState] =
    useState<SaveState>('idle');

  const [stepError, setStepError] =
    useState<string | null>(null);


  /* ------------------------------------------------------------------------ */
  /* Conference tracks                                                        */
  /* ------------------------------------------------------------------------ */

  const tracksQuery =
    useQuery({
      queryKey: [
        'conferences',
        conferenceId,
        'tracks-for-submission',
      ],

      queryFn: () =>
        apiGet<ConferenceTrack[]>(
          `conferences/${conferenceId}/tracks-for-submission`,
        ),
    });


  /* ------------------------------------------------------------------------ */
  /* Dynamic submission fields                                               */
  /* ------------------------------------------------------------------------ */

  const formFieldsQuery =
    useQuery({
      queryKey: [
        'conferences',
        conferenceId,
        'form-fields-for-submission',
      ],

      queryFn: () =>
        apiGet<ConferenceFormField[]>(
          `conferences/${conferenceId}/form-fields-for-submission`,
        ),
    });


  const tracksAvailable =
    tracksQuery.isSuccess;

  const customFieldsAvailable =
    formFieldsQuery.isSuccess;


  /*
   * Only ACTIVE fields are returned by the backend,
   * but we also keep this frontend filter as a safety layer.
   */
  const activeFields =
    (formFieldsQuery.data ?? [])
      .filter(
        (field) =>
          field.status === 'ACTIVE',
      );


  /*
   * AUTHOR_BLOCK is a special field.
   *
   * It must NOT be rendered by DynamicFormField.
   * It has its own dedicated AuthorListEditor.
   */
  const authorBlockField =
    activeFields.find(
      (field) =>
        field.fieldType ===
        'AUTHOR_BLOCK',
    );


  /*
   * All normal dynamic fields.
   *
   * AUTHOR_BLOCK is deliberately removed from this list.
   */
  const dynamicFields =
    activeFields.filter(
      (field) =>
        field.fieldType !==
        'AUTHOR_BLOCK',
    );


  /*
   * Whether this conference currently
   * has an active Authors & Co-authors field.
   */
  const hasAuthorBlock =
    Boolean(authorBlockField);


  /* ------------------------------------------------------------------------ */
  /* API mutations                                                            */
  /* ------------------------------------------------------------------------ */

  const createDraft =
    useCreateAbstractDraft(
      conferenceId,
    );

  const saveVersion =
    useSaveAbstractVersion(
      abstractId ?? '',
    );

  const setAbstractAuthors =
    useSetAbstractAuthors(
      abstractId ?? '',
    );

  const submitAbstract =
    useSubmitAbstract(
      abstractId ?? '',
    );


  /* ------------------------------------------------------------------------ */
  /* Basics form                                                              */
  /* ------------------------------------------------------------------------ */

  const {
    register: registerBasics,
    handleSubmit:
      handleBasicsSubmit,
    watch: watchBasics,
    setValue:
      setBasicsValue,
    getValues:
      getBasicsValues,
    formState: {
      errors: basicsErrors,
    },
  } =
    useForm<BasicsValues>({
      resolver:
        zodResolver(
          basicsSchema,
        ),

      defaultValues: {
        submissionType:
          'ORAL',

        ...existingBasics,
      },
    });


  const trackId =
    watchBasics('trackId');

  const submissionType =
    watchBasics(
      'submissionType',
    );


  /* ------------------------------------------------------------------------ */
  /* Step 1 - Basics                                                          */
  /* ------------------------------------------------------------------------ */

  async function handleBasicsNext(
    values: BasicsValues,
  ) {
    setStepError(null);

    try {
      if (!abstractId) {
        const abstract =
          await createDraft.mutateAsync(
            values,
          );

        setAbstractId(
          abstract.id,
        );
      }

      setStep(1);
    } catch (error) {
      setStepError(
        error instanceof Error
          ? error.message
          : 'Failed to save.',
      );
    }
  }


  /* ------------------------------------------------------------------------ */
  /* Step 2 - Dynamic fields                                                  */
  /* ------------------------------------------------------------------------ */

  async function saveCustomFields(): Promise<boolean> {
    setSaveState('saving');

    try {
      await saveVersion.mutateAsync({
        ...getBasicsValues(),
        formData,
      });

      setSaveState('saved');

      return true;
    } catch {
      setSaveState('error');

      return false;
    }
  }


  async function handleCustomFieldsNext() {
    const ok =
      await saveCustomFields();

    if (!ok) {
      return;
    }


    /*
     * If an AUTHOR_BLOCK exists,
     * go to the dedicated Authors step.
     *
     * Otherwise skip directly to Review.
     */
    if (hasAuthorBlock) {
      setStep(2);
    } else {
      setStep(3);
    }
  }


  /* ------------------------------------------------------------------------ */
  /* Step 3 - Authors                                                         */
  /* ------------------------------------------------------------------------ */

  async function handleAuthorsSave(
    nextAuthors: AuthorInput[],
  ) {
    setStepError(null);

    try {
      /*
       * AUTHOR_BLOCK has its own API/storage.
       *
       * Do not put author data inside formData.
       */
      await setAbstractAuthors.mutateAsync(
        nextAuthors,
      );

      setAuthors(
        nextAuthors,
      );

      setStep(3);
    } catch (error) {
      setStepError(
        error instanceof Error
          ? error.message
          : 'Failed to save authors.',
      );
    }
  }


  /* ------------------------------------------------------------------------ */
  /* Final submission                                                         */
  /* ------------------------------------------------------------------------ */

  async function handleSubmitAbstract() {
    setStepError(null);

    try {
      await submitAbstract.mutateAsync();

      router.push(
        '/my-abstracts',
      );
    } catch (error) {
      setStepError(
        error instanceof Error
          ? error.message
          : 'Failed to submit.',
      );
    }
  }


  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="max-w-2xl space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* Progress                                                            */}
      {/* ------------------------------------------------------------------ */}

      <SubmissionProgress
        currentStep={step}
      />


      {/* ------------------------------------------------------------------ */}
      {/* Resume warning                                                      */}
      {/* ------------------------------------------------------------------ */}

      {existingAbstractId ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          There is no way to retrieve your previously saved custom-field
          answers or author list — please re-enter them below before saving
          or submitting again.
        </div>
      ) : null}


      {/* ================================================================== */}
      {/* STEP 0 - BASIC INFORMATION                                         */}
      {/* ================================================================== */}

      {step === 0 ? (
        <form
          onSubmit={handleBasicsSubmit(
            handleBasicsNext,
          )}
          className="space-y-4"
          noValidate
        >

          {/* Title */}
          <FormField
            label="Title"
            htmlFor="abstract-title"
            error={
              basicsErrors.title?.message
            }
          >
            <Input
              id="abstract-title"
              {...registerBasics(
                'title',
              )}
            />
          </FormField>


          {/* Submission type */}
          <FormField
            label="Submission type"
            htmlFor="abstract-type"
            error={
              basicsErrors
                .submissionType
                ?.message
            }
          >
            <Select
              value={
                submissionType
              }
              onValueChange={(
                value,
              ) =>
                value &&
                setBasicsValue(
                  'submissionType',
                  value as SubmissionType,
                )
              }
            >
              <SelectTrigger
                id="abstract-type"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {SUBMISSION_TYPES.map(
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
          </FormField>


          {/* Track */}
          {tracksAvailable ? (
            <FormField
              label="Track (optional)"
              htmlFor="abstract-track"
            >
              <Select
                value={trackId}
                onValueChange={(
                  value,
                ) =>
                  setBasicsValue(
                    'trackId',
                    value ??
                      undefined,
                  )
                }
              >
                <SelectTrigger
  id="abstract-track"
  className="w-full"
>
  <SelectValue placeholder="No track">
    {tracksQuery.data?.find(
      (track) => track.id === trackId,
    )?.name ?? 'No track'}
  </SelectValue>
</SelectTrigger>

                <SelectContent>
                  {(
                    tracksQuery.data ??
                    []
                  ).map(
                    (track) => (
                      <SelectItem
                        key={track.id}
                        value={track.id}
                      >
                        {track.name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}


          {/* Presentation preference */}
          <FormField
            label="Presentation preference (optional)"
            htmlFor="abstract-preference"
          >
            <Input
              id="abstract-preference"
              {...registerBasics(
                'presentationPreference',
              )}
            />
          </FormField>


          {/* Error */}
          {stepError ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {stepError}
            </p>
          ) : null}


          <Button
            type="submit"
            disabled={
              createDraft.isPending
            }
          >
            {createDraft.isPending
              ? 'Saving…'
              : 'Next'}
          </Button>

        </form>
      ) : null}


      {/* ================================================================== */}
      {/* STEP 1 - CUSTOM SUBMISSION FIELDS                                  */}
      {/* ================================================================== */}

      {step === 1 ? (
        <div className="space-y-4">

          {!customFieldsAvailable ? (
            <p className="text-sm text-muted-foreground">
              No custom questions are
              available to show here
              right now.
            </p>
          ) : dynamicFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This conference has no
              custom submission questions.
            </p>
          ) : (
            <div className="space-y-4">

              {dynamicFields.map(
                (field) => (
                  <DynamicFormField
                    key={field.id}
                    field={field}
                    value={
                      formData[
                        field.fieldKey
                      ]
                    }
                    onChange={(
                      value,
                    ) =>
                      setFormData(
                        (prev) => ({
                          ...prev,

                          [field.fieldKey]:
                            value,
                        }),
                      )
                    }
                    uploadFile={
                      uploadFile
                    }
                  />
                ),
              )}

            </div>
          )}


          {/* Save indicator */}
          <SaveIndicator
            state={saveState}
            onRetry={
              saveCustomFields
            }
          />


          {/* Navigation */}
          <div className="flex gap-2">

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setStep(0)
              }
            >
              Back
            </Button>


            <Button
              type="button"
              onClick={
                handleCustomFieldsNext
              }
              disabled={
                saveVersion.isPending
              }
            >
              {saveVersion.isPending
                ? 'Saving…'
                : 'Next'}
            </Button>

          </div>

        </div>
      ) : null}


      {/* ================================================================== */}
      {/* STEP 2 - AUTHORS / CO-AUTHORS                                      */}
      {/* ================================================================== */}

      {step === 2 ? (
        <div className="space-y-4">

          {hasAuthorBlock ? (
            <>
              <div>
                <h2 className="text-sm font-semibold">
                  {authorBlockField?.label ??
                    'Authors & Co-authors'}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Add the authors and
                  co-authors for this
                  submission.
                </p>
              </div>


              <AuthorListEditor
                defaultAuthors={
                  authors.length > 0
                    ? authors
                    : [
                        {
                          firstName: '',
                          lastName: '',
                        },
                      ]
                }
                onSave={
                  handleAuthorsSave
                }
              />


              {stepError ? (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {stepError}
                </p>
              ) : null}


              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setStep(1)
                }
              >
                Back
              </Button>
            </>
          ) : (
            /*
             * Safety fallback.
             *
             * Normally this step is skipped when
             * AUTHOR_BLOCK is not active.
             */
            <div className="space-y-4">

              <p className="text-sm text-muted-foreground">
                Authors are not configured
                for this conference.
              </p>

              <Button
                type="button"
                onClick={() =>
                  setStep(3)
                }
              >
                Continue
              </Button>

            </div>
          )}

        </div>
      ) : null}


      {/* ================================================================== */}
      {/* STEP 3 - REVIEW                                                     */}
      {/* ================================================================== */}

      {step === 3 ? (
        <div className="space-y-4">

          <h2 className="text-sm font-semibold">
            Review
          </h2>


          <dl className="grid grid-cols-2 gap-2 text-sm">

            <dt className="text-muted-foreground">
              Title
            </dt>

            <dd>
              {getBasicsValues(
                'title',
              )}
            </dd>


            <dt className="text-muted-foreground">
              Type
            </dt>

            <dd>
              {getBasicsValues(
                'submissionType',
              )}
            </dd>


            <dt className="text-muted-foreground">
              Authors
            </dt>

            <dd>
              {hasAuthorBlock
                ? authors.length
                : 'Not configured'}
            </dd>

          </dl>


          {/* Error */}
          {stepError ? (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {stepError}
            </p>
          ) : null}


          {/* Navigation */}
          <div className="flex gap-2">

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setStep(
                  hasAuthorBlock
                    ? 2
                    : 1,
                )
              }
            >
              Back
            </Button>


            <Button
              type="button"
              onClick={
                handleSubmitAbstract
              }
              disabled={
                submitAbstract.isPending
              }
            >
              {submitAbstract.isPending
                ? 'Submitting…'
                : 'Submit abstract'}
            </Button>

          </div>

        </div>
      ) : null}

    </div>
  );
}