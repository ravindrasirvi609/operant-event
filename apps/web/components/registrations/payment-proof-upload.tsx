'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { uploadFile as defaultUploadFile } from '@/lib/api/upload-file';

interface PaymentProofUploadProps {
  onSubmit: (input: {
    reference?: string;
    proofFileId?: string;
  }) => Promise<void>;
  uploadFile?: (file: File) => Promise<string>;
}

export function PaymentProofUpload({
  onSubmit,
  uploadFile = defaultUploadFile,
}: PaymentProofUploadProps) {
  const [reference, setReference] = useState('');
  const [proofFileId, setProofFileId] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setUploadFailed(false);
    setProofFileId(undefined);

    try {
      const fileId = await uploadFile(file);
      setProofFileId(fileId);
    } catch {
      setUploadFailed(true);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        reference: reference.trim() || undefined,
        proofFileId,
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to submit payment proof. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full rounded-lg border p-4">
        <p className="font-medium">Payment proof submitted</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Awaiting organizer verification.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <FormField
        label="Reference (e.g. bank transfer UTR)"
        htmlFor="payment-reference"
      >
        <Input
          id="payment-reference"
          name="reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          className="w-full min-w-0"
          autoComplete="off"
          placeholder="Enter transaction reference"
        />
      </FormField>

      <FormField
        label="Proof file (receipt / screenshot)"
        htmlFor="payment-proof-file"
      >
        <input
          id="payment-proof-file"
          name="paymentProof"
          type="file"
          accept="image/*,.pdf"
          className="block w-full min-w-0 max-w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2"
          onChange={handleFileChange}
          disabled={uploading || submitting}
        />
      </FormField>

      {uploading && (
        <p className="text-sm text-muted-foreground">
          Uploading proof file…
        </p>
      )}

      {uploadFailed && (
        <p className="break-words rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          File upload failed. You can still submit a transaction reference
          for manual verification.
        </p>
      )}

      {submitError && (
        <p role="alert" className="break-words text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={submitting || uploading}
        onClick={handleSubmit}
      >
        {submitting ? 'Submitting…' : 'Submit payment proof'}
      </Button>
    </div>
  );
}