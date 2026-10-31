import { createBrowserRouter } from 'react-router';
import { AppShell } from '@/widgets/app-shell';

/**
 * All pages in one place. New page = one new route here.
 *
 * `lazy` = code splitting: each page's code (e.g. the chart library on the dashboard) is
 * downloaded only when you open that page, so the first load stays small and fast.
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    // Plain text on purpose: importing shared/ui here would pull the chart library into the
    // first download (that barrel file also exports the chart component).
    hydrateFallbackElement: <p className="p-6 text-sm">Loading…</p>,
    children: [
      {
        index: true,
        lazy: () => import('@/pages/dashboard').then((m) => ({ Component: m.DashboardPage })),
      },
      {
        path: 'expenses',
        lazy: () => import('@/pages/expenses').then((m) => ({ Component: m.ExpensesPage })),
      },
      {
        path: 'import',
        lazy: () => import('@/pages/import').then((m) => ({ Component: m.ImportPage })),
      },
    ],
  },
]);
