import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AmountInput } from './AmountInput';

function Harness() {
  const [digits, setDigits] = useState('');
  return (
    <>
      <AmountInput aria-label="Amount" value={digits} onValueChange={setDigits} />
      <output data-testid="digits">{digits}</output>
    </>
  );
}

const setup = () => {
  render(<Harness />);
  return {
    input: screen.getByLabelText<HTMLInputElement>('Amount'),
    digits: () => screen.getByTestId('digits').textContent,
  };
};

describe('AmountInput', () => {
  afterEach(cleanup);

  it('shows grouped thousands but hands the form plain digits', () => {
    const { input, digits } = setup();
    fireEvent.change(input, { target: { value: '1250000' } });
    expect(input.value).toBe('1 250 000');
    expect(digits()).toBe('1250000');
  });

  it('accepts a Telegram-style paste and ignores letters', () => {
    const { input, digits } = setup();
    fireEvent.change(input, { target: { value: '65.000' } });
    expect(input.value).toBe('65 000');
    fireEvent.change(input, { target: { value: '65 000x' } });
    expect(input.value).toBe('65 000');
    expect(digits()).toBe('65000');
  });

  it('Backspace right after a space deletes the digit before it', () => {
    const { input, digits } = setup();
    fireEvent.change(input, { target: { value: '65000' } });
    input.focus();
    input.setSelectionRange(3, 3); // "65 |000"
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(input.value).toBe('6 000');
    expect(digits()).toBe('6000');
    expect(input.selectionStart).toBe(1); // "6| 000"
  });

  it('opens the numeric keyboard on phones', () => {
    const { input } = setup();
    expect(input.inputMode).toBe('numeric');
    expect(input.type).toBe('text');
  });
});
