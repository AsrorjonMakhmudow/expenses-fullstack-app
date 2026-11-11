import { LoginSchema } from '@expenses/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { authApi } from '@/entities/user';
import { Button, Field, inputClassName } from '@/shared/ui';
import { fieldErrors } from '../model/field-errors';
import { useStartSession } from '../model/use-start-session';

type FieldName = 'email' | 'password';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const startSession = useStartSession();
  const login = useMutation({ mutationFn: authApi.login, onSuccess: startSession });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors<FieldName>(parsed.error));
      return;
    }
    setErrors({});
    login.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <Field label="Email" error={errors.email}>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          className={inputClassName}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <input
          type="password"
          autoComplete="current-password"
          className={inputClassName}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {login.error && (
        <p role="alert" className="text-sm text-danger">
          {login.error.message}
        </p>
      )}
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
