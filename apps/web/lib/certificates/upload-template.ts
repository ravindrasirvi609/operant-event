
import { parseApiResponse } from '@/lib/api/backend';

export interface CertificateTemplateUploadResult {
  message: string;
  templateFileId: string;
  mimeType: string;
  updatedAt: string;
}

export async function uploadCertificateTemplate(
  conferenceId: string,
  file: File,
  fetchImpl: typeof fetch = fetch,
): Promise<CertificateTemplateUploadResult> {
  const allowedTypes = ['image/png', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PNG and PDF templates are supported.');
  }

  if (file.size > maxSize) {
    throw new Error('Template file must be 5 MB or smaller.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchImpl(
    `/api/proxy/conferences/${encodeURIComponent(conferenceId)}/settings/certificate-template`,
    {
      method: 'POST',
      body: formData,
      credentials: 'include',
    },
  );

  return parseApiResponse<CertificateTemplateUploadResult>(response);
}
