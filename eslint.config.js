import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', '.vercel/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
    rules: {
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: [
      'lib/**/*.mjs',
      'api/**/*.js',
      'scripts/**/*.mjs',
      'test/**/*.js',
      'server.mjs',
      'eslint.config.js',
    ],
    languageOptions: { globals: globals.node },
  },
  { files: ['public/**/*.js'], languageOptions: { globals: globals.browser } },
  {
    files: ['public/domain/**/*.js'],
    rules: { 'no-restricted-globals': ['error', 'window', 'document', 'fetch', 'localStorage'] },
  },
];
