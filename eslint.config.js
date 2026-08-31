'use strict';

const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/', '.isaac/'],
  },
  js.configs.recommended,
  {
    // Browser-console script: runs inside a web mail client. Its top-level
    // functions are entry points invoked manually from the console, so
    // "unused" definitions are expected.
    files: ['autoemailer1_main.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        document: 'readonly',
        prompt: 'readonly',
        alert: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        module: 'writable',
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
  {
    // Node/Bun files: unit tests and this config itself.
    files: ['**/*.test.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        require: 'readonly',
      },
    },
  },
];
