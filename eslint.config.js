import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist/**', 'docs/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      globals: {
        chrome: 'readonly', document: 'readonly', window: 'readonly', URL: 'readonly', Blob: 'readonly', fetch: 'readonly', console: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', crypto: 'readonly', Document: 'readonly', Element: 'readonly', HTMLElement: 'readonly',
        HTMLImageElement: 'readonly', HTMLCanvasElement: 'readonly', CanvasRenderingContext2D: 'readonly', location: 'readonly', MutationObserver: 'readonly', URLSearchParams: 'readonly', createImageBitmap: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-control-regex': 'off',
    },
  },
  { files: ['*.config.ts', '*.config.js'], languageOptions: { globals: { process: 'readonly', __dirname: 'readonly' } } },
];
