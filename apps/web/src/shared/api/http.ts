/**
 * The ONLY place the web app talks HTTP. Every entity's API functions go through here, so
 * errors, headers and the base URL are handled once (DRY).
 */

const BASE_URL = '/api/v1';

/** An error the UI can show: status + the server's message + field errors (if any). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type QueryValue = string | number | undefined | null;

/** { from: '2026-01-01', q: undefined } → "?from=2026-01-01" (empty values are skipped). */
export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isJsonBody = init.body !== undefined && !(init.body instanceof FormData);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(isJsonBody && { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const { message, errors } = (body ?? {}) as { message?: unknown; errors?: unknown };
    throw new ApiError(
      response.status,
      typeof message === 'string' ? message : `Request failed (${response.status})`,
      Array.isArray(errors) ? errors : [],
    );
  }
  return body as T;
}

export const json = (data: unknown): string => JSON.stringify(data);
