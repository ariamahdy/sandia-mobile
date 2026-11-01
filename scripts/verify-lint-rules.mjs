import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { ESLint } from 'eslint';

const imports = '@typescript-eslint/no-restricted-imports';
const syntax = 'no-restricted-syntax';

const cases = [
  {
    name: 'config must not import pages',
    filePath: 'src/config/x.ts',
    code: "import { a } from '@pages';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'utils must not import data',
    filePath: 'src/utils/x.ts',
    code: "import { a } from '@data';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'data must not import helpers',
    filePath: 'src/data/x.ts',
    code: "import { a } from '@helpers';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'helpers must not import components',
    filePath: 'src/helpers/x.ts',
    code: "import { a } from '@components';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'components must not import pages',
    filePath: 'src/components/x.ts',
    code: "import { a } from '@pages/demo';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'pages must not import hooks',
    filePath: 'src/pages/x.ts',
    code: "import { a } from '@hooks';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'pages may import config types',
    filePath: 'src/pages/x.ts',
    code: "import type { Env } from '@config';\nexport type E = Env;\n",
    expect: null,
  },
  {
    name: 'deep relative imports are banned',
    filePath: 'src/pages/x.ts',
    code: "import type { Env } from '../config';\nexport type E = Env;\n",
    expect: imports,
  },
  {
    name: 'core must not import @uat',
    filePath: 'src/config/x.ts',
    code: "import { a } from '@uat/anything';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'core must not import private/',
    filePath: 'src/hooks/x.ts',
    code: "import { a } from 'private/src/config';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'root configs must not import pages',
    filePath: 'x.wdio.conf.ts',
    code: "import { a } from '@pages';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'specs must not import hooks',
    filePath: 'tests/e2e/demo/x.spec.ts',
    code: "import { a } from '@hooks';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'specs must not import $ from @wdio/globals',
    filePath: 'tests/e2e/demo/x.spec.ts',
    code: "import { $ } from '@wdio/globals';\nexport const b = $;\n",
    expect: imports,
  },
  {
    name: 'specs must not import driver from @wdio/globals',
    filePath: 'tests/e2e/demo/x.spec.ts',
    code: "import { driver } from '@wdio/globals';\nexport const b = driver;\n",
    expect: imports,
  },
  {
    name: 'specs may import expect from @wdio/globals',
    filePath: 'tests/e2e/demo/x.spec.ts',
    code: "import { expect } from '@wdio/globals';\nexport const e = expect;\n",
    expect: null,
  },
  {
    name: 'specs must not create page objects',
    filePath: 'tests/e2e/demo/x.spec.ts',
    code: 'class LoginPage {\n  readonly id = 1;\n}\nexport const page = new LoginPage();\n',
    expect: syntax,
  },
  {
    name: 'specs must not branch with if',
    filePath: 'tests/e2e/demo/x.spec.ts',
    code: 'export function f(a: boolean): number {\n  if (a) {\n    return 1;\n  }\n  return 2;\n}\n',
    expect: syntax,
  },
  {
    name: 'specs must not branch with a ternary',
    filePath: 'tests/e2e/demo/x.spec.ts',
    code: 'export const f = (a: boolean): number => (a ? 1 : 2);\n',
    expect: syntax,
  },
  {
    name: '.only is banned',
    filePath: 'tests/unit/x.spec.ts',
    code: "describe.only('suite', () => {\n  it('case', () => undefined);\n});\n",
    expect: 'mocha/no-exclusive-tests',
  },
  {
    name: '.skip is banned',
    filePath: 'tests/unit/x.spec.ts',
    code: "describe('suite', () => {\n  it.skip('case', () => undefined);\n});\n",
    expect: 'mocha/no-pending-tests',
  },
  {
    name: 'this.skip() is banned',
    filePath: 'tests/unit/x.spec.ts',
    code: "describe('suite', () => {\n  it('case', function () {\n    this.skip();\n  });\n});\n",
    expect: 'mocha/no-pending-tests',
  },
  {
    name: 'identical test titles are banned',
    filePath: 'tests/unit/x.spec.ts',
    code: "describe('suite', () => {\n  it('case', () => undefined);\n  it('case', () => undefined);\n});\n",
    expect: 'mocha/no-identical-title',
  },
  {
    name: 'browser.pause is banned',
    filePath: 'tests/unit/x.spec.ts',
    code: "import { browser } from '@wdio/globals';\nexport const wait = () => browser.pause(1);\n",
    expect: 'wdio/no-pause',
  },
  {
    name: 'driver.pause is banned in src',
    filePath: 'src/helpers/x.ts',
    code: "import { driver } from '@wdio/globals';\nexport const wait = () => driver.pause(1);\n",
    expect: 'wdio/no-pause',
  },
  {
    name: 'driver.debug is banned',
    filePath: 'src/pages/x.ts',
    code: "import { driver } from '@wdio/globals';\nexport const stop = () => driver.debug();\n",
    expect: 'wdio/no-debug',
  },
  {
    name: 'expect on an element must be awaited',
    filePath: 'tests/unit/x.spec.ts',
    code: "import { $, expect } from '@wdio/globals';\nit('shows', () => {\n  expect($('~id')).toBeDisplayed();\n});\n",
    expect: 'wdio/await-expect',
  },
  {
    name: 'void on a promise is banned in tests',
    filePath: 'tests/unit/x.spec.ts',
    code: "import { $, expect } from '@wdio/globals';\nit('shows', () => {\n  void expect($('~id')).toBeDisplayed();\n});\n",
    expect: syntax,
  },
  {
    name: 'void is banned in specs too',
    filePath: 'tests/e2e/demo/x.spec.ts',
    code: 'export const f = (p: Promise<void>): void => {\n  void p;\n};\n',
    expect: syntax,
  },
  {
    name: 'any is banned',
    filePath: 'src/utils/x.ts',
    code: 'export const id = (value: any): unknown => value;\n',
    expect: '@typescript-eslint/no-explicit-any',
  },
  {
    name: 'unit tests may import any layer',
    filePath: 'tests/unit/x.spec.ts',
    code: "import type { Env } from '@config';\nexport type E = Env;\n",
    expect: null,
  },
  {
    name: 'private pages must not import private hooks',
    filePath: 'private/src/pages/x.ts',
    code: "import { a } from '@uat/src/hooks';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'private specs must not import private components',
    filePath: 'private/tests/e2e/x.spec.ts',
    code: "import { a } from '@uat/src/components';\nexport const b = a;\n",
    expect: imports,
  },
  {
    name: 'private specs must not use .only',
    filePath: 'private/tests/e2e/x.spec.ts',
    code: "describe.only('suite', () => {\n  it('case', () => undefined);\n});\n",
    expect: 'mocha/no-exclusive-tests',
  },
];

const eslint = new ESLint();
let failed = 0;

for (const [index, c] of cases.entries()) {
  const filePath = join(dirname(c.filePath), basename(c.filePath).replace(/^x/, `__verify_lint_${index}__`));
  const createdDir = mkdirSync(dirname(filePath), { recursive: true });
  let errors;
  try {
    writeFileSync(filePath, c.code);
    const [result] = await eslint.lintText(c.code, { filePath });
    errors = result.messages.filter((m) => m.severity === 2 || m.fatal);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${c.name}: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  } finally {
    rmSync(createdDir ?? filePath, { recursive: true, force: true });
  }
  const ruleIds = errors.map((m) => m.ruleId ?? `fatal: ${m.message}`);
  const ok = c.expect === null ? errors.length === 0 : ruleIds.includes(c.expect);
  if (ok) {
    console.log(`PASS ${c.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${c.name}: expected ${c.expect ?? 'no errors'}, got [${ruleIds.join(', ')}]`);
  }
}

if (failed > 0) {
  console.error(`${failed}/${cases.length} lint rule checks failed`);
  process.exit(1);
}
console.log(`${cases.length}/${cases.length} lint rule checks passed`);
