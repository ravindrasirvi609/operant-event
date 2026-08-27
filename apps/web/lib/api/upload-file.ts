import { parseApiResponse } from './backend';

interface UploadedFile {
  id: string;
  fileName: string;
}

/**
 * Hits the membership-free `files/self` route — for callers with no
 * organization context at all (abstract authors, registrants submitting
 * payment proof), not the organizer-facing `files` route, which requires
 * an active organization membership.
 */
export async function uploadFile(file: File, fetchImpl: typeof fetch = fetch): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetchImpl('/api/proxy/files/self', { method: 'POST', body: formData });
  const uploaded = await parseApiResponse<UploadedFile>(response);
  return uploaded.id;
}
