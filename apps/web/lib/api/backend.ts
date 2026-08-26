export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Normalizes every backend response (real Nest error shape or otherwise) into one typed contract. */
export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body: { message?: string } = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? response.statusText, body);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
