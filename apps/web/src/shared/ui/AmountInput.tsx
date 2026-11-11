import { useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { deleteAcrossSeparator, formatAmountInput, groupThousands } from '@/shared/lib';
import type { AmountInputState } from '@/shared/lib';

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode'
>;

export interface AmountInputProps extends NativeProps {
  /** Digits only ("1250000"), "" when empty. */
  value: string;
  onValueChange: (digits: string) => void;
}

/**
 * Amount field that groups thousands while you type: 1250000 → "1 250 000".
 * The parent keeps plain digits; only the display has spaces.
 */
export function AmountInput({ value, onValueChange, onKeyDown, ...props }: AmountInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  /** Cursor position to restore after React re-renders the reformatted text. */
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = ref.current;
    if (input && pendingCaret.current !== null && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  function apply(next: AmountInputState) {
    pendingCaret.current = next.caret;
    onValueChange(next.digits);
    // Same digits but different text (e.g. a letter typed): React won't re-render — fix it here.
    const input = ref.current;
    if (next.digits === value && input) {
      input.value = next.text;
      input.setSelectionRange(next.caret, next.caret);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { value: raw, selectionStart } = event.target;
    apply(formatAmountInput(raw, selectionStart ?? raw.length));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const { selectionStart, selectionEnd, value: text } = event.currentTarget;
    if (selectionStart === null || selectionStart !== selectionEnd) return;
    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    const next = deleteAcrossSeparator(text, selectionStart, event.key);
    if (next) {
      event.preventDefault();
      apply(next);
    }
  }

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={groupThousands(value)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}
