import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

// Feature-Sliced Design linter: checks layer rules (no upward imports, public API only…).
export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // This rule says "a slice used in only one place should be merged into that place".
      // We deliberately keep every widget/feature as its own slice: our #1 principle is
      // "add a feature = add a folder, remove it = delete the folder" (ADR 0002, 0007).
      'fsd/insignificant-slice': 'off',
    },
  },
]);
