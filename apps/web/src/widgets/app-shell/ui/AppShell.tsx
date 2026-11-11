import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router';
import { currentUserQuery } from '@/entities/user';
import { SignOutButton } from '@/features/sign-out';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/expenses', label: 'Expenses', end: false },
  { to: '/import', label: 'Import', end: false },
];

/** The frame around every page: header + navigation, page content in <Outlet />. */
export function AppShell() {
  const { data: user } = useQuery(currentUserQuery);
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <nav
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3"
          aria-label="Main"
        >
          <span className="mr-4 font-semibold">💸 Expenses</span>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-accent text-white' : 'text-ink-2 hover:bg-page'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-ink-2 sm:inline" title="Signed in as">
                {user.email}
              </span>
            )}
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
