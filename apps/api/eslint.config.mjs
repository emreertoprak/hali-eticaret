import js from '@eslint/js';
import n from 'eslint-plugin-n';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: { n, 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'n/no-process-exit': 'off',
      'n/prefer-node-protocol': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'warn',
      // Knex sorgu satırları tipsizdir; DTO eşlemelerinde any bilinçli olarak kullanılır.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
