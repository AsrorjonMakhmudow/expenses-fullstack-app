// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * One ESLint config for the whole monorepo (DRY).
 * App-specific blocks below add rules only where they apply.
 */
export default defineConfig(
  globalIgnores(['**/node_modules/**', '**/dist/**', '**/coverage/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Prefer `import type` for types: keeps runtime imports honest.
      '@typescript-eslint/consistent-type-imports': 'error',
      // Unused variables are allowed only if they start with "_" (intentionally ignored).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      // Front-door rule: import shared code only from the package root, never its internals.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@expenses/shared/*'], message: 'Import from "@expenses/shared" only.' },
          ],
        },
      ],
    },
  },
  {
    // NestJS reads constructor parameter TYPES at runtime (decorator metadata) to inject
    // dependencies. Telling typescript-eslint about it stops the auto-fixer from turning
    // those imports into `import type` — which would silently break dependency injection.
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
  // Prettier owns formatting; this turns off ESLint rules that would fight it. Keep it last.
  prettier,
);
