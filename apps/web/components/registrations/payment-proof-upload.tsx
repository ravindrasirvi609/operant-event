'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { uploadFile as defaultUploadFile } from '@/lib/api/upload-file';

interface PaymentProofUploadProps {
  onSubmit: (input: { reference?: string; proofFileId?: string }) => Promise<void>;
  /** Injected so this component never needs to know how uploads are actually performed. */
  uploadFile?: (file: File) => Promise<string>;
}

/**
 * Uploads via the membership-free `files/self` route. `proofFileId` is
 * optional on `SubmitManualPaymentProofDto`, so if the upload itself
 * fails for any reason (network, unsupported file, etc.) the registrant
 * can still submit a reference (e.g. a bank transfer UTR) alone.
 */
export function PaymentProofUpload({ onSubmit, uploadFile = defaultUploadFile }: PaymentProofUploadProps) {
  const [reference, setReference] = useState('');
  const [proofFileId, setProofFileId] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploading(true);
    setUploadFailed(false);
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
    try {
      await onSubmit({ reference: reference || undefined, proofFileId });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <p className="text-sm font-medium">Submitted — awaiting confirmation.</p>;
  }

  return (
    <div className="max-w-sm space-y-3">
      <FormField label="Reference (e.g. bank transfer UTR)" htmlFor="payment-reference">
        <Input id="payment-reference" value={reference} onChange={(event) => setReference(event.target.value)} />
      </FormField>
      <FormField label="Proof file (receipt / screenshot)" htmlFor="payment-proof-file">
        <input
          id="payment-proof-file"
          type="file"
          className="text-sm"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </FormField>
      {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      {uploadFailed ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          File upload failed — enter a reference number instead and the organizer will confirm your payment
          manually.
        </p>
      ) : null}
      <Button type="button" disabled={submitting} onClick={handleSubmit}>
        {submitting ? 'Submitting…' : 'Submit payment proof'}
      </Button>
    </div>
  );
}
