import { parseApiResponse } from './backend';

interface UploadedFile {
  id: string;
  fileName: string;
}

/**
 * `FilesController` requires `PermissionsGuard` (an active organization
 * membership) even though nothing on that route is permission-gated
 * beyond that — an author with no organization membership cannot upload
 * a file at all. This will surface as an `ApiError` (403) for that
 * caller; callers of `uploadFile` must handle that case explicitly
 * rather than assume every authenticated user can reach it.
 */
export async function uploadFile(file: File, fetchImpl: typeof fetch = fetch): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetchImpl('/api/proxy/files', { method: 'POST', body: formData });
  const uploaded = await parseApiResponse<UploadedFile>(response);
  return uploaded.id;
}
