import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Small, dumb UI building blocks. No business logic, no data fetching — that's FSD's "shared". */

export function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      {(title ?? action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-ink-2">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  secondary: 'border border-line bg-surface text-ink hover:bg-page',
  danger: 'text-danger hover:bg-danger/10',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-ink-3">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg bg-danger/10 p-3 text-sm text-danger"
    >
      <span>{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-ink-3">{children}</p>;
}
