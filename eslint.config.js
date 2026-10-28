// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * One ESLint config for the whole monorepo (DRY).
 * Apps can add their own rules later (React rules for web, boundary rules for api).
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
    },
  },
  // Prettier owns formatting; this turns off ESLint rules that would fight it. Keep it last.
  prettier,
);
