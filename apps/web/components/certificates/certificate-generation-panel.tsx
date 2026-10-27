'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CertificateStatusBadge } from '@/components/certificates/certificate-status-badge';
import {
  useConferenceCertificates,
  useGenerateCertificates,
  useIssueCertificate,
  useRevokeCertificate,
} from '@/hooks/use-certificates';
import {
  useConferenceSettings,
  useUpdateConferenceSettings,
} from '@/hooks/use-conference-settings';
import type {
  CertificateTemplateField,
  CertificateTemplateFieldPositions,
} from '@/lib/conferences/types';
import type { Certificate } from '@/lib/certificates/types';
import { uploadCertificateTemplate } from '@/lib/certificates/upload-template';

const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024;

const FIELD_LABELS: Record<CertificateTemplateField, string> = {
  participantName: 'Participant Name',
  conferenceName: 'Conference Name',
  date: 'Date',
  certificateNumber: 'Certificate Number',
  qrCode: 'QR Code',
};

const DEFAULT_POSITIONS: CertificateTemplateFieldPositions = {
  participantName: { x: 50, y: 48 },
  conferenceName: { x: 50, y: 28 },
  date: { x: 50, y: 72 },
  certificateNumber: { x: 82, y: 90 },
  qrCode: { x: 90, y: 15 },
};

type DragState = {
  field: CertificateTemplateField;
  pointerId: number;
};

export function CertificateGenerationPanel({
  conferenceId,
}: {
  conferenceId: string;
}) {
  const certificatesQuery = useConferenceCertificates(conferenceId);
  const settingsQuery = useConferenceSettings(conferenceId);
  const updateSettings = useUpdateConferenceSettings(conferenceId);
  const generate = useGenerateCertificates(conferenceId);
  const issue = useIssueCertificate(conferenceId);
  const revoke = useRevokeCertificate(conferenceId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [generated, setGenerated] = useState<Certificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerationSuccess, setRegenerationSuccess] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [savedPreviewUrl, setSavedPreviewUrl] = useState<string | null>(null);
  const [savedPreviewLoading, setSavedPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [savingPositions, setSavingPositions] = useState(false);
  const [positionsSaved, setPositionsSaved] = useState<string | null>(null);
  const [positions, setPositions] =
    useState<CertificateTemplateFieldPositions>(DEFAULT_POSITIONS);

  // Automatically dismiss successful upload/save messages after 3 seconds.
  useEffect(() => {
    if (!uploadSuccess) return;

    const timeout = window.setTimeout(() => {
      setUploadSuccess(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [uploadSuccess]);

  useEffect(() => {
    if (!positionsSaved) return;

    const timeout = window.setTimeout(() => {
      setPositionsSaved(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [positionsSaved]);

  
  // Automatically dismiss the regeneration success message after 3 seconds.
  useEffect(() => {
    if (!regenerationSuccess) return;

    const timeout = window.setTimeout(() => {
      setRegenerationSuccess(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [regenerationSuccess]);


  const settings = settingsQuery.data;
  const templateFileId = settings?.certificateTemplateFileId ?? null;
  const templateMimeType = settings?.certificateTemplateMimeType ?? null;
  const hasSavedTemplate = Boolean(templateFileId && templateMimeType);
  const activePreviewUrl = localPreviewUrl ?? savedPreviewUrl;
  const activeMimeType = selectedFile?.type ?? templateMimeType;
  const isPdf = activeMimeType === 'application/pdf';

  // Create and revoke a browser object URL for the selected local file.
  useEffect(() => {
    if (!selectedFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the previous local preview when no file is selected.
      setLocalPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialize editable positions from the asynchronously loaded conference settings.
    setPositions(settings?.certificateTemplateFieldPositions ?? DEFAULT_POSITIONS);
  }, [settings?.certificateTemplateFieldPositions]);

  useEffect(() => {
    if (!hasSavedTemplate || selectedFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the saved preview when it should no longer be displayed.
      setSavedPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setSavedPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    let createdUrl: string | null = null;

    async function loadSavedTemplate() {
      setSavedPreviewLoading(true);
      try {
        const response = await fetch(
          `/api/proxy/conferences/${encodeURIComponent(conferenceId)}/settings/certificate-template`,
          {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Saved template was not found. Please upload it again.'
              : 'Failed to load the saved certificate template.',
          );
        }

        const blob = await response.blob();
        createdUrl = URL.createObjectURL(blob);
        setSavedPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return createdUrl;
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load the saved certificate template.',
        );
      } finally {
        if (!controller.signal.aborted) setSavedPreviewLoading(false);
      }
    }

    void loadSavedTemplate();

    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [
    conferenceId,
    hasSavedTemplate,
    selectedFile,
    settings?.certificateTemplateUpdatedAt,
  ]);

  const handleFileChange = useCallback((file: File | undefined) => {
    setError(null);
    setUploadSuccess(null);
    setPositionsSaved(null);

    if (!file) return;

    if (!['image/png', 'application/pdf'].includes(file.type)) {
      setSelectedFile(null);
      setError('Only PNG and PDF templates are supported.');
      return;
    }

    if (file.size > MAX_TEMPLATE_SIZE) {
      setSelectedFile(null);
      setError('Template file must be 5 MB or smaller.');
      return;
    }

    setSelectedFile(file);
  }, []);

  async function handleTemplateUpload() {
    if (!selectedFile) {
      setError('Please select a PNG or PDF template first.');
      return;
    }

    setError(null);
    setUploadSuccess(null);
    setUploading(true);

    try {
      const result = await uploadCertificateTemplate(conferenceId, selectedFile);
      setUploadSuccess(result.message);
      setSelectedFile(null);
      await settingsQuery.refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to upload certificate template.',
      );
    } finally {
      setUploading(false);
    }
  }

  function handleMarkerPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    field: CertificateTemplateField,
  ) {
    if (!previewContainerRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { field, pointerId: event.pointerId };
    setPositionsSaved(null);
  }

  function handleMarkerPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const container = previewContainerRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !container) return;

    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));

    setPositions((current) => ({
      ...current,
      [drag.field]: {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
      },
    }));
  }

  function handleMarkerPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  async function handleSavePositions() {
    setError(null);
    setPositionsSaved(null);
    setSavingPositions(true);

    try {
      await updateSettings.mutateAsync({
        certificateTemplateFieldPositions: positions,
      });
      setPositionsSaved('Field positions saved successfully.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save field positions.',
      );
    } finally {
      setSavingPositions(false);
    }
  }

  async function handleGenerate() {
    setError(null);

    try {
      const result = await generate.mutateAsync();
      setGenerated(result);
      await certificatesQuery.refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate certificates.',
      );
    }
  }

  async function handleIssue(certificateId: string) {
    setError(null);

    try {
      await issue.mutateAsync(certificateId);
      await certificatesQuery.refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to issue certificate.',
      );
    }
  }

  async function handleRevoke(certificateId: string) {
    setError(null);

    try {
      await revoke.mutateAsync(certificateId);
      await certificatesQuery.refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to revoke certificate.',
      );
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRegeneratePdf(certificateId: string) {
    setError(null);
    setRegenerationSuccess(null);
    setRegeneratingId(certificateId);

    try {
      const response = await fetch(
        `/api/proxy/certificates/${encodeURIComponent(certificateId)}/regenerate-pdf`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        const responseText = await response.text();
        let message = responseText || `Failed to regenerate PDF (HTTP ${response.status}).`;

        try {
          const body = JSON.parse(responseText) as {
            message?: string;
            error?: { message?: string };
          };
          message = body.message ?? body.error?.message ?? message;
        } catch {
          // Keep the plain-text response when the server did not return JSON.
        }

        throw new Error(message);
      }

      await certificatesQuery.refetch();
      setRegenerationSuccess('Certificate PDF regenerated. Download it again to verify the uploaded template.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to regenerate certificate PDF.',
      );
    } finally {
      setRegeneratingId(null);
    }
  }


  const certificates = certificatesQuery.data ?? [];

  return (
    <div className="max-w-5xl space-y-6">
      <section className="space-y-4 rounded-lg border p-4 sm:p-6">
        <div>
          <h3 className="text-lg font-semibold">Certificate Template</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a PNG image or PDF certificate background. Maximum file size: 5 MB.
            After uploading, drag the field markers to set their positions.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,application/pdf,.png,.pdf"
          className="hidden"
          onChange={(event) => {
            handleFileChange(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose template
          </Button>
          <span className="max-w-full break-all text-sm text-muted-foreground">
            {selectedFile?.name ??
              (hasSavedTemplate ? 'Saved template' : 'No file selected')}
          </span>
        </div>

        {savedPreviewLoading ? (
          <p className="text-sm text-muted-foreground">Loading saved template...</p>
        ) : null}

        {activePreviewUrl ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Template preview and field positioning
            </h4>
            <p className="text-xs text-muted-foreground">
              Drag the blue markers. Coordinates are saved as percentages of the preview area.
              For best alignment, use a landscape certificate template.
            </p>

            <div
              ref={previewContainerRef}
              className="relative w-full overflow-hidden rounded-lg border bg-white"
              style={{ aspectRatio: '1.414 / 1', touchAction: 'none' }}
            >
              {isPdf ? (
                <iframe
                  src={activePreviewUrl}
                  title="Certificate PDF template preview"
                  className="pointer-events-none absolute inset-0 h-full w-full bg-white"
                />
              ) : (
                <img
                  src={activePreviewUrl}
                  alt="Certificate template preview"
                  className="pointer-events-none absolute inset-0 h-full w-full object-fill"
                />
              )}

              {(
                Object.keys(FIELD_LABELS) as CertificateTemplateField[]
              ).map((field) => {
                const position = positions[field] ?? DEFAULT_POSITIONS[field]!;
                return (
                  <button
                    key={field}
                    type="button"
                    aria-label={`Move ${FIELD_LABELS[field]} field`}
                    title={`${FIELD_LABELS[field]} (${position.x.toFixed(1)}%, ${position.y.toFixed(1)}%)`}
                    onPointerDown={(event) => handleMarkerPointerDown(event, field)}
                    onPointerMove={handleMarkerPointerMove}
                    onPointerUp={handleMarkerPointerUp}
                    onPointerCancel={handleMarkerPointerUp}
                    className="absolute z-10 max-w-[45%] -translate-x-1/2 -translate-y-1/2 cursor-move select-none rounded-md border-2 border-blue-700 bg-blue-600/90 px-2 py-1 text-[10px] font-semibold text-white shadow-md sm:text-xs"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      touchAction: 'none',
                    }}
                  >
                    {FIELD_LABELS[field]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={savingPositions || !hasSavedTemplate && !selectedFile}
                onClick={() => setPositions(DEFAULT_POSITIONS)}
              >
                Reset positions
              </Button>
              <Button
                type="button"
                disabled={savingPositions || !hasSavedTemplate}
                onClick={() => void handleSavePositions()}
              >
                {savingPositions ? 'Saving positions...' : 'Save positions'}
              </Button>
            </div>
            {!hasSavedTemplate && selectedFile ? (
              <p className="text-xs text-muted-foreground">
                Upload this template first. You can save positions after the upload succeeds.
              </p>
            ) : null}
            {positionsSaved ? (
              <p role="status" className="text-sm text-green-700">{positionsSaved}</p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          disabled={!selectedFile || uploading}
          onClick={() => void handleTemplateUpload()}
        >
          {uploading ? 'Uploading...' : 'Upload template'}
        </Button>

        {uploadSuccess ? (
          <p role="status" className="text-sm text-green-700">{uploadSuccess}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Certificate Generation</h3>
          <p className="text-sm text-muted-foreground">
            Generate certificates for eligible participants.
          </p>
        </div>

        <Button disabled={generate.isPending} onClick={() => void handleGenerate()}>
          {generate.isPending ? 'Generating...' : 'Generate certificates'}
        </Button>

        {generated !== null ? (
          <p className="text-sm text-muted-foreground">
            {generated.length} newly eligible.
          </p>
        ) : null}
      </section>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {regenerationSuccess ? (
        <p role="status" className="text-sm text-green-700">{regenerationSuccess}</p>
      ) : null}

      <section className="space-y-2">
        <h3 className="font-medium">All certificates</h3>

        {certificatesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading certificates...</p>
        ) : certificatesQuery.isError ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">Failed to load certificates.</p>
            <Button variant="outline" size="sm" onClick={() => void certificatesQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No certificates found. Click Generate certificates to check eligibility.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {certificates.map((certificate) => {
              const holder = certificate.registration?.user;
              const fullName = [holder?.firstName, holder?.lastName]
                .filter(Boolean)
                .join(' ')
                .trim();
              const displayName = fullName || holder?.email || 'Unknown participant';

              return (
                <li
                  key={certificate.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{displayName}</span>
                    <span className="text-muted-foreground">{certificate.certificateType}</span>
                    <CertificateStatusBadge status={certificate.status} />
                  </div>

                  <div className="flex items-center gap-2">
                    {certificate.status === 'ELIGIBLE' ? (
                      <Button
                        size="sm"
                        disabled={issue.isPending}
                        onClick={() => void handleIssue(certificate.id)}
                      >
                        {issue.isPending ? 'Issuing...' : 'Issue'}
                      </Button>
                    ) : null}

                    {certificate.status === 'ISSUED' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={regeneratingId !== null || !hasSavedTemplate}
                          onClick={() => void handleRegeneratePdf(certificate.id)}
                        >
                          {regeneratingId === certificate.id ? 'Regenerating...' : 'Regenerate PDF'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={revoke.isPending}
                          onClick={() => setRevokingId(certificate.id)}
                        >
                          Revoke
                        </Button>
                      </>
                    ) : null}

                    {certificate.status === 'REVOKED' ? (
                      <span className="text-muted-foreground">Revoked</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={revokingId !== null}
        onOpenChange={(open) => {
          if (!open) setRevokingId(null);
        }}
        title="Revoke this certificate?"
        description="The holder will no longer be able to verify this certificate. This action cannot be undone."
        confirmLabel="Revoke"
        isConfirming={revoke.isPending}
        onConfirm={() => {
          if (revokingId) void handleRevoke(revokingId);
        }}
      />
    </div>
  );
}
