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

/**
 * Extracts a useful error message from the different
 * error response shapes returned by the backend.
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const data = body as {
    message?: unknown;
    error?: {
      message?: unknown;
    };
  };

  // Current API error shape:
  // { error: { code: "Conflict", message: "..." } }
  if (typeof data.error?.message === 'string') {
    return data.error.message;
  }

  // Standard NestJS-style error:
  // { message: "..." }
  if (typeof data.message === 'string') {
    return data.message;
  }

  // Validation errors can sometimes return:
  // { message: ["field is required", "..."] }
  if (Array.isArray(data.message)) {
    const messages = data.message.filter(
      (message): message is string => typeof message === 'string',
    );

    if (messages.length > 0) {
      return messages.join(', ');
    }
  }

  return fallback;
}

/** Normalizes every backend response into one typed contract. */
export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);

    const message = extractErrorMessage(
      body,
      response.statusText || `Request failed with status ${response.status}`,
    );

    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (text.trim().length === 0) {
  return null as T;
}

return JSON.parse(text) as T;
}