import type { ReactNode } from 'react';

/** A narrow card in the middle of the screen — for sign-in style pages. */
export function CenteredPanel({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-lg font-semibold">💸 Expenses</p>
        <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-ink-2">{subtitle}</div>}
          <div className="mt-5">{children}</div>
        </section>
        {footer && <p className="mt-4 text-center text-sm text-ink-2">{footer}</p>}
      </div>
    </main>
  );
}
