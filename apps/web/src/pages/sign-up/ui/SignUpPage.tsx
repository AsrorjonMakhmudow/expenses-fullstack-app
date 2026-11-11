import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import { authConfigQuery } from '@/entities/user';
import { SignUpForm } from '@/features/auth-by-password';
import { CenteredPanel, Spinner } from '@/shared/ui';

export function SignUpPage() {
  const state: unknown = useLocation().state;
  const config = useQuery(authConfigQuery);
  return (
    <CenteredPanel
      title="Create your account"
      subtitle="Your expenses stay private: only you can see them."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={state} className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {config.isPending ? (
        <Spinner />
      ) : config.data?.registrationEnabled === false ? (
        <p role="status" className="text-sm text-ink-2">
          Registration is closed. Ask the owner of this app for an account.
        </p>
      ) : (
        <SignUpForm />
      )}
    </CenteredPanel>
  );
}
