import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi, userKeys } from '@/entities/user';
import { Button } from '@/shared/ui';

/** Ends this browser's session and forgets every cached response before leaving. */
export function SignOutButton() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const signOut = useMutation({
    mutationFn: authApi.logout,
    // Even if the server can't be reached, sign out locally — never leave data on screen.
    onSettled: () => {
      client.clear();
      client.setQueryData(userKeys.me, null);
      void navigate('/login', { replace: true });
    },
  });

  return (
    <Button variant="secondary" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
      Sign out
    </Button>
  );
}
