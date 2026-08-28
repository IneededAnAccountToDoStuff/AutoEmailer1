'use strict';

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['node_modules/', '.isaac/', 'dist/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Browser-console script: runs inside a web mail client. Its top-level
    // functions are entry points invoked manually from the console, so
    // "unused" definitions are expected.
    files: ['autoemailer1_main.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // This flat config is a CommonJS module.
    files: ['eslint.config.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'writable' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
