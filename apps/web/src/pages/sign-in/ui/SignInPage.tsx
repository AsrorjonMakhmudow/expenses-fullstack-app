import { Link, useLocation } from 'react-router';
import { SignInForm } from '@/features/auth-by-password';
import { CenteredPanel } from '@/shared/ui';

export function SignInPage() {
  const state = useLocation().state as { reason?: string; from?: string } | null;
  return (
    <CenteredPanel
      title="Sign in"
      footer={
        <>
          No account yet?{' '}
          <Link to="/register" state={state} className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {state?.reason === 'expired' && (
        <p role="status" className="mb-4 rounded-lg bg-accent/10 p-3 text-sm text-ink">
          Your session expired. Please sign in again.
        </p>
      )}
      <SignInForm />
    </CenteredPanel>
  );
}
