/**
 * Exhaustiveness check for discriminated unions.
 *
 *   switch (line.kind) { ...every case...; default: return assertNever(line); }
 *
 * If someone adds a new kind and forgets to handle it, `line` is no longer `never`
 * and this call stops compiling — the compiler reminds us, not a bug in production.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
