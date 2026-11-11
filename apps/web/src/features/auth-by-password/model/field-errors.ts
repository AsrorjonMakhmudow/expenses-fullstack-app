import type { z } from 'zod';

/** First message per field from a failed schema check: { email: '…', password: '…' }. */
export function fieldErrors<T extends string>(error: z.ZodError): Partial<Record<T, string>> {
  const result: Partial<Record<T, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as T;
    result[field] ??= issue.message;
  }
  return result;
}
