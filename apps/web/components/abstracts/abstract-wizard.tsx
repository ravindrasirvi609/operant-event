'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthorListEditor } from '@/components/abstracts/author-list-editor';
import { SaveIndicator, type SaveState } from '@/components/abstracts/save-indicator';
import { SubmissionProgress } from '@/components/abstracts/submission-progress';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCreateAbstractDraft,
  useSaveAbstractVersion,
  useSetAbstractAuthors,
  useSubmitAbstract,
} from '@/hooks/use-abstracts';
import { DynamicFormField } from '@/lib/forms/dynamic-field-renderer';
import { apiGet } from '@/lib/api/client';
import { uploadFile } from '@/lib/api/upload-file';
import { SUBMISSION_TYPES, type AuthorInput, type SubmissionType } from '@/lib/abstracts/types';
import type { ConferenceFormField } from '@/lib/conferences/form-field.types';
import type { ConferenceTrack } from '@/lib/conferences/types';

const basicsSchema = z.object({
  title: z.string().min(1, 'Enter a title.'),
  submissionType: z.enum(SUBMISSION_TYPES),
  trackId: z.string().optional(),
  presentationPreference: z.string().optional(),
});

type BasicsValues = z.infer<typeof basicsSchema>;

interface AbstractWizardProps {
  conferenceId: string;
  /** Resume mode: an existing DRAFT/REVISION_REQUIRED abstract. See the component-level note on why formData/authors can't be pre-filled. */
  existingAbstractId?: string;
  existingBasics?: Partial<BasicsValues>;
}

/**
 * `GET conferences/:conferenceId/tracks` and `GET
 * conferences/:conferenceId/form-fields` both require `PermissionsGuard`
 * (an active organization membership) — an author with no organization
 * membership at all cannot reach either one, even though
 * `AbstractsController`'s own author routes are explicitly built to need
 * no org context. Both fetches below are attempted and degrade
 * gracefully (no track picker / no custom-fields step) rather than
 * blocking the whole flow — but for a conference with **required**
 * active custom fields, the backend's own submit-time validation
 * (running server-side, independent of what the client could read) will
 * still reject the submission. That half of the gap has no frontend
 * workaround; it needs a backend fix (a public or `JwtAuthGuard`-only
 * read variant of both endpoints, matching the pattern the author routes
 * already use).
 */
export function AbstractWizard({ conferenceId, existingAbstractId, existingBasics }: AbstractWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [abstractId, setAbstractId] = useState<string | undefined>(existingAbstractId);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [authors, setAuthors] = useState<AuthorInput[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [stepError, setStepError] = useState<string | null>(null);

  const tracksQuery = useQuery({
    queryKey: ['conferences', conferenceId, 'tracks', 'wizard'],
    queryFn: () => apiGet<ConferenceTrack[]>(`conferences/${conferenceId}/tracks`),
    retry: false,
  });
  const formFieldsQuery = useQuery({
    queryKey: ['conferences', conferenceId, 'form-fields', 'wizard'],
    queryFn: () => apiGet<ConferenceFormField[]>(`conferences/${conferenceId}/form-fields`),
    retry: false,
  });
  const tracksAvailable = tracksQuery.isSuccess;
  const activeFields = (formFieldsQuery.data ?? []).filter((field) => field.status === 'ACTIVE');
  const customFieldsAvailable = formFieldsQuery.isSuccess;

  const createDraft = useCreateAbstractDraft(conferenceId);
  const saveVersion = useSaveAbstractVersion(abstractId ?? '');
  const setAbstractAuthors = useSetAbstractAuthors(abstractId ?? '');
  const submitAbstract = useSubmitAbstract(abstractId ?? '');

  const {
    register: registerBasics,
    handleSubmit: handleBasicsSubmit,
    watch: watchBasics,
    setValue: setBasicsValue,
    getValues: getBasicsValues,
    formState: { errors: basicsErrors },
  } = useForm<BasicsValues>({
    resolver: zodResolver(basicsSchema),
    defaultValues: { submissionType: 'ORAL', ...existingBasics },
  });
  const trackId = watchBasics('trackId');
  const submissionType = watchBasics('submissionType');

  async function handleBasicsNext(values: BasicsValues) {
    setStepError(null);
    try {
      if (!abstractId) {
        const abstract = await createDraft.mutateAsync(values);
        setAbstractId(abstract.id);
      }
      setStep(1);
    } catch (error) {
      setStepError(error instanceof Error ? error.message : 'Failed to save.');
    }
  }

  async function saveCustomFields(): Promise<boolean> {
    setSaveState('saving');
    try {
      await saveVersion.mutateAsync({ ...getBasicsValues(), formData });
      setSaveState('saved');
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }

  async function handleCustomFieldsNext() {
    const ok = await saveCustomFields();
    if (ok) {
      setStep(2);
    }
  }

  async function handleAuthorsSave(nextAuthors: AuthorInput[]) {
    setStepError(null);
    try {
      await setAbstractAuthors.mutateAsync(nextAuthors);
      setAuthors(nextAuthors);
      setStep(3);
    } catch (error) {
      setStepError(error instanceof Error ? error.message : 'Failed to save authors.');
    }
  }

  async function handleSubmitAbstract() {
    setStepError(null);
    try {
      await submitAbstract.mutateAsync();
      router.push('/my-abstracts');
    } catch (error) {
      setStepError(error instanceof Error ? error.message : 'Failed to submit.');
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SubmissionProgress currentStep={step} />

      {existingAbstractId ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          There is no way to retrieve your previously saved custom-field answers or author list — please re-enter
          them below before saving or submitting again.
        </div>
      ) : null}

      {step === 0 ? (
        <form onSubmit={handleBasicsSubmit(handleBasicsNext)} className="space-y-4" noValidate>
          <FormField label="Title" htmlFor="abstract-title" error={basicsErrors.title?.message}>
            <Input id="abstract-title" {...registerBasics('title')} />
          </FormField>
          <FormField label="Submission type" htmlFor="abstract-type" error={basicsErrors.submissionType?.message}>
            <Select
              value={submissionType}
              onValueChange={(value) => value && setBasicsValue('submissionType', value as SubmissionType)}
            >
              <SelectTrigger id="abstract-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBMISSION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {tracksAvailable ? (
            <FormField label="Track (optional)" htmlFor="abstract-track">
              <Select value={trackId} onValueChange={(value) => setBasicsValue('trackId', value ?? undefined)}>
                <SelectTrigger id="abstract-track" className="w-full">
                  <SelectValue placeholder="No track" />
                </SelectTrigger>
                <SelectContent>
                  {(tracksQuery.data ?? []).map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      {track.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
          <FormField label="Presentation preference (optional)" htmlFor="abstract-preference">
            <Input id="abstract-preference" {...registerBasics('presentationPreference')} />
          </FormField>
          {stepError ? (
            <p role="alert" className="text-sm text-destructive">
              {stepError}
            </p>
          ) : null}
          <Button type="submit" disabled={createDraft.isPending}>
            {createDraft.isPending ? 'Saving…' : 'Next'}
          </Button>
        </form>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          {!customFieldsAvailable ? (
            <p className="text-sm text-muted-foreground">
              No custom questions are available to show here right now.
            </p>
          ) : activeFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">This conference has no custom submission questions.</p>
          ) : (
            activeFields.map((field) => (
              <DynamicFormField
                key={field.id}
                field={field}
                value={formData[field.fieldKey]}
                onChange={(value) => setFormData((prev) => ({ ...prev, [field.fieldKey]: value }))}
                uploadFile={uploadFile}
              />
            ))
          )}
          <SaveIndicator state={saveState} onRetry={saveCustomFields} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={handleCustomFieldsNext} disabled={saveVersion.isPending}>
              {saveVersion.isPending ? 'Saving…' : 'Next'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <AuthorListEditor defaultAuthors={authors.length > 0 ? authors : [{ firstName: '', lastName: '' }]} onSave={handleAuthorsSave} />
          {stepError ? (
            <p role="alert" className="text-sm text-destructive">
              {stepError}
            </p>
          ) : null}
          <Button variant="outline" onClick={() => setStep(1)}>
            Back
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Review</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Title</dt>
            <dd>{getBasicsValues('title')}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd>{getBasicsValues('submissionType')}</dd>
            <dt className="text-muted-foreground">Authors</dt>
            <dd>{authors.length}</dd>
          </dl>
          {stepError ? (
            <p role="alert" className="text-sm text-destructive">
              {stepError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleSubmitAbstract} disabled={submitAbstract.isPending}>
              {submitAbstract.isPending ? 'Submitting…' : 'Submit abstract'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
