/**
 * Public API of @expenses/shared.
 * Other packages may import ONLY what is exported here — never deep paths like
 * "@expenses/shared/src/expense-import/...". This "front door" rule lets us change
 * internals freely (see docs/adr/0002).
 */
export type { IsoDate } from './lib/date.js';
export { parseDmyDate, parseIsoDatePrefix, toIsoDate } from './lib/date.js';
export { parseSomAmount } from './lib/money.js';
export * from './expense-import/index.js';
export * from './expense/expense.contract.js';
export * from './import/import.contract.js';
