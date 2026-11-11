import type { ReactNode } from 'react';

/** The look of every text input. */
export const inputClassName =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:outline-2 focus:outline-accent';

/** Label + input + error message, stacked. The <label> wraps the input → clicking the label focuses it. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm text-ink-2">
      {label}
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}
