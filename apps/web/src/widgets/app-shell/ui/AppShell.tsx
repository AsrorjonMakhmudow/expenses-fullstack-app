import { NavLink, Outlet } from 'react-router';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/expenses', label: 'Expenses', end: false },
  { to: '/import', label: 'Import', end: false },
];

/** The frame around every page: header + navigation, page content in <Outlet />. */
export function AppShell() {
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
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
