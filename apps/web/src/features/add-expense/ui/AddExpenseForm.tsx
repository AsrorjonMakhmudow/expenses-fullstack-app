import { CreateExpenseSchema, parseSomAmount } from '@expenses/shared';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ApiError } from '@/shared/api';
import { todayIso } from '@/shared/lib';
import { Button } from '@/shared/ui';
import { useCreateExpense } from '../model/use-create-expense';

type FieldName = 'date' | 'amount' | 'description';
type FieldErrors = Partial<Record<FieldName, string>>;

// Human messages instead of the schema's technical ones ("Too small: expected string…").
const FRIENDLY_ERRORS: Record<FieldName, string> = {
  date: 'Pick a valid date',
  amount: "Whole so'm, e.g. 65.000",
  description: 'What was it for?',
};

const inputClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink';

/**
 * Add one expense by hand. The amount is typed the same way you write it in Telegram
 * ("65.000"), and validated with the SAME schema the server uses — instant feedback for
 * you, while the server still re-checks everything (client validation is UX, not security).
 */
export function AddExpenseForm() {
  const [date, setDate] = useState(todayIso);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const createExpense = useCreateExpense();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = CreateExpenseSchema.safeParse({
      date,
      amount: parseSomAmount(amount) ?? Number.NaN,
      description,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        next[field] ??= FRIENDLY_ERRORS[field];
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await createExpense.mutateAsync(parsed.data);
      setAmount('');
      setDescription('');
    } catch {
      // shown below from createExpense.error
    }
  }

  const serverError = createExpense.error instanceof ApiError ? createExpense.error.message : null;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-3 sm:grid-cols-[10rem_10rem_1fr_auto] sm:items-start"
    >
      <Field label="Date" error={errors.date}>
        <input
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <Field label="Amount (so'm)" error={errors.amount}>
        <input
          inputMode="numeric"
          placeholder="65.000"
          className={inputClass}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="Description" error={errors.description}>
        <input
          placeholder="билайн номеримга ташадим"
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="sm:pt-6">
        <Button type="submit" disabled={createExpense.isPending} className="w-full">
          {createExpense.isPending ? 'Saving…' : 'Add'}
        </Button>
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-danger sm:col-span-4">
          {serverError}
        </p>
      )}
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm text-ink-2">
      {label}
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}
