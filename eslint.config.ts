import js from '@eslint/js';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import mocha from 'eslint-plugin-mocha';
import wdioPlugin from 'eslint-plugin-wdio';
import tseslint from 'typescript-eslint';

const wdio = wdioPlugin.configs['flat/recommended'].plugins.wdio;

type Layer = 'config' | 'utils' | 'data' | 'helpers' | 'components' | 'pages' | 'hooks';
type RestrictedPath = { name: string; message: string; allowTypeImports?: boolean; allowImportNames?: string[] };

const specGlobals: RestrictedPath = {
  name: '@wdio/globals',
  allowImportNames: ['expect'],
  message: 'Specs import only expect from @wdio/globals; selectors and driver calls belong in page objects.',
};

const uatPatterns = (uatLayers?: Layer[]) =>
  uatLayers === undefined
    ? [
        { group: ['@uat', '@uat/*'], message: 'Core must not import @uat.' },
        { regex: '(^|/)private(/|$)', message: 'Core must not import private/.' },
      ]
    : uatLayers.map((layer) => ({
        group: [`@uat/src/${layer}`, `@uat/src/${layer}/*`],
        message: `Layering: @uat/src/${layer} is not allowed here.`,
      }));

const restrict = (files: string[], layers: Layer[], paths: RestrictedPath[] = [], uatLayers?: Layer[]): Linter.Config => ({
  files,
  rules: {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths,
        patterns: [
          ...layers.map((layer) => ({ group: [`@${layer}`, `@${layer}/*`], message: `Layering: @${layer} is not allowed here.` })),
          ...uatPatterns(uatLayers),
          { regex: '^\\.\\./', message: 'Use a path alias instead of a deep relative import.' },
        ],
      },
    ],
  },
});

const noVoid = {
  selector: "UnaryExpression[operator='void']",
  message: 'Await promises in tests; void hides an unawaited assertion.',
};

const testRules: Linter.Config['rules'] = { 'no-restricted-syntax': ['error', noVoid] };

const specRules: Linter.Config['rules'] = {
  'no-restricted-syntax': [
    'error',
    noVoid,
    { selector: 'NewExpression[callee.name=/Page$/]', message: 'Use the exported page instance from @pages.' },
    { selector: 'IfStatement', message: 'No conditionals in specs.' },
    { selector: 'ConditionalExpression', message: 'No conditionals in specs.' },
    { selector: 'SwitchStatement', message: 'No conditionals in specs.' },
  ],
};

export default defineConfig(
  globalIgnores(['node_modules/', 'apps/', 'test-results/', 'allure-results/', 'allure-report/', 'shared-errors/']),
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly', fetch: 'readonly' } },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: __dirname } },
    plugins: { wdio },
    rules: {
      'no-restricted-imports': 'off',
      'wdio/no-pause': ['error', { instances: ['browser', 'driver'] }],
      'wdio/no-debug': ['error', { instances: ['browser', 'driver'] }],
    },
  },
  {
    files: ['tests/**/*.ts', 'private/tests/**/*.ts'],
    plugins: { mocha },
    rules: {
      ...testRules,
      'wdio/await-expect': 'error',
      'mocha/no-exclusive-tests': 'error',
      'mocha/no-pending-tests': 'error',
      'mocha/no-identical-title': 'error',
    },
  },
  restrict(['src/config/**/*.ts'], ['utils', 'data', 'helpers', 'components', 'pages', 'hooks']),
  restrict(['src/utils/**/*.ts'], ['data', 'helpers', 'components', 'pages', 'hooks']),
  restrict(['src/data/**/*.ts'], ['helpers', 'components', 'pages', 'hooks']),
  restrict(['src/helpers/**/*.ts'], ['components', 'pages', 'hooks']),
  restrict(['src/components/**/*.ts'], ['helpers', 'pages', 'hooks']),
  restrict(['src/pages/**/*.ts'], ['hooks']),
  restrict(['src/hooks/**/*.ts'], []),
  restrict(['*.conf.ts'], ['utils', 'data', 'helpers', 'components', 'pages']),
  restrict(['tests/**/*.ts'], ['config', 'utils', 'helpers', 'components', 'hooks'], [specGlobals]),
  { files: ['tests/e2e/**/*.ts', 'private/tests/e2e/**/*.ts'], rules: specRules },
  restrict(['tests/unit/**/*.ts'], []),
  restrict(['private/src/config/**/*.ts'], ['utils', 'data', 'helpers', 'components', 'pages', 'hooks'], [], ['utils', 'data', 'helpers', 'components', 'pages', 'hooks']),
  restrict(['private/src/utils/**/*.ts'], ['data', 'helpers', 'components', 'pages', 'hooks'], [], ['data', 'helpers', 'components', 'pages', 'hooks']),
  restrict(['private/src/data/**/*.ts'], ['helpers', 'components', 'pages', 'hooks'], [], ['helpers', 'components', 'pages', 'hooks']),
  restrict(['private/src/helpers/**/*.ts'], ['components', 'pages', 'hooks'], [], ['components', 'pages', 'hooks']),
  restrict(['private/src/components/**/*.ts'], ['helpers', 'pages', 'hooks'], [], ['helpers', 'pages', 'hooks']),
  restrict(['private/src/pages/**/*.ts'], ['hooks'], [], ['hooks']),
  restrict(['private/src/hooks/**/*.ts'], [], [], []),
  restrict(['private/tests/**/*.ts'], ['config', 'utils', 'helpers', 'components', 'hooks'], [specGlobals], ['config', 'utils', 'helpers', 'components', 'hooks']),
  restrict(['private/tests/unit/**/*.ts'], [], [], []),
);
