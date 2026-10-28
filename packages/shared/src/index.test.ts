import { describe, expect, it } from 'vitest';
import { APP_NAME } from './index';

describe('workspace setup', () => {
  it('runs tests in the shared package', () => {
    expect(APP_NAME).toBe('expenses-app');
  });
});
