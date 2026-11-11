import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionExpiry, userKeys } from '@/entities/user';
import { SignInForm } from '@/features/auth-by-password';
import { http } from '@/shared/api';
import { GuestOnly, RequireAuth } from './route-guards';
import { installSessionExpiryHandler } from './session-expiry-handler';

const ME = { id: 'u1', email: 'asror@mail.uz' };

/** A fake API: path → [status, body]. */
function mockApi(routes: Record<string, [number, unknown]>) {
  const fetchMock = vi.fn(async (url: string) => {
    const [status, body] = routes[url.replace('/api/v1', '')] ?? [404, { message: 'nope' }];
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp(
  start: string,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const router = createMemoryRouter(
    [
      {
        element: <GuestOnly />,
        children: [{ path: '/login', element: <LoginProbe /> }],
      },
      {
        element: <RequireAuth />,
        children: [{ path: '/expenses', element: <p>Private expenses page</p> }],
      },
    ],
    { initialEntries: [start] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, client };
}

/** Sign-in page stand-in that shows the router state it received. */
function LoginProbe() {
  return (
    <>
      <p>Sign-in page</p>
      <SignInForm />
    </>
  );
}

describe('auth flow (web)', () => {
  beforeEach(() => sessionExpiry.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('not signed in → private page redirects to sign-in, remembering where you were', async () => {
    mockApi({ '/auth/me': [401, { message: 'Not signed in' }] });
    const { router } = renderApp('/expenses');
    await screen.findByText('Sign-in page');
    expect(router.state.location.state).toMatchObject({ from: '/expenses' });
  });

  it('signing in clears old cached data and returns to the page you wanted', async () => {
    mockApi({
      '/auth/me': [401, { message: 'Not signed in' }],
      '/auth/login': [200, ME],
    });
    const { client, router } = renderApp('/expenses');
    client.setQueryData(['expenses', 'list', {}], 'previous user data');
    await screen.findByText('Sign-in page');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'Asror@Mail.uz' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText('Private expenses page');
    expect(router.state.location.pathname).toBe('/expenses');
    expect(client.getQueryData(['expenses', 'list', {}])).toBeUndefined();
    expect(client.getQueryData(userKeys.me)).toEqual(ME);
  });

  it('shows the server message for a wrong password (and does not treat it as "expired")', async () => {
    mockApi({
      '/auth/me': [401, { message: 'Not signed in' }],
      '/auth/login': [401, { message: 'Wrong email or password' }],
    });
    renderApp('/login');
    await screen.findByText('Sign-in page');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.uz' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Wrong email or password');
    expect(sessionExpiry.isExpired()).toBe(false);
  });

  it('checks the form before calling the server', async () => {
    const fetchMock = mockApi({ '/auth/me': [401, {}] });
    renderApp('/login');
    await screen.findByText('Sign-in page');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/v1/auth/login', expect.anything());
  });

  it('session expires while the tab is open → data dropped, sign-in with "expired" reason', async () => {
    mockApi({ '/auth/me': [200, ME], '/expenses': [401, { message: 'Not signed in' }] });
    const { client, router } = renderApp('/expenses');
    const uninstall = installSessionExpiryHandler(client);
    await screen.findByText('Private expenses page');
    client.setQueryData(['expenses', 'list', {}], 'my data');

    await act(async () => {
      await http('/expenses').catch(() => undefined); // the next request gets 401
    });

    await screen.findByText('Sign-in page');
    expect(router.state.location.state).toMatchObject({ reason: 'expired', from: '/expenses' });
    expect(client.getQueryData(['expenses', 'list', {}])).toBeUndefined();
    uninstall();
  });

  it('already signed in → the sign-in page sends you into the app', async () => {
    mockApi({ '/auth/me': [200, ME] });
    const { router } = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
