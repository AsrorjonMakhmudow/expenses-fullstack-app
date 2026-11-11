import { PASSWORD_MIN_LENGTH, RegisterSchema } from '@expenses/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { authApi } from '@/entities/user';
import { Button, Field, inputClassName } from '@/shared/ui';
import { fieldErrors } from '../model/field-errors';
import { useStartSession } from '../model/use-start-session';

type FieldName = 'email' | 'password' | 'repeat';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const startSession = useStartSession();
  const register = useMutation({ mutationFn: authApi.register, onSuccess: startSession });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = RegisterSchema.safeParse({ email, password });
    const next: Partial<Record<FieldName, string>> = parsed.success
      ? {}
      : fieldErrors<FieldName>(parsed.error);
    if (!next.password && password !== repeat) next.repeat = 'The passwords are different';
    setErrors(next);
    if (parsed.success && Object.keys(next).length === 0) register.mutate(parsed.data);
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
      <Field
        label={`Password (at least ${PASSWORD_MIN_LENGTH} characters)`}
        error={errors.password}
      >
        <input
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Repeat password" error={errors.repeat}>
        <input
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </Field>
      {register.error && (
        <p role="alert" className="text-sm text-danger">
          {register.error.message}
        </p>
      )}
      <Button type="submit" disabled={register.isPending}>
        {register.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
