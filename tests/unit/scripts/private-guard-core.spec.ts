import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type AddedLine = { commit: string; file: string; line: string };
type Violation = { kind: string; where: string };
type PrivateGuardModule = {
  MIN_PASSWORD_LENGTH: number;
  findPrivateViolations: (input: { trackedFiles: string[]; addedLines: AddedLine[]; password: string }) => Violation[];
  passwordFromEnv: (text: string) => string;
};

const load = async () =>
  (await import(pathToFileURL(resolve('scripts/lib/private-guard-core.mjs')).href)) as PrivateGuardModule;

describe('findPrivateViolations', () => {
  it('returns nothing for a clean private repository', async () => {
    const { findPrivateViolations } = await load();
    assert.deepEqual(
      findPrivateViolations({ trackedFiles: ['.env.example', 'src/pages/a.page.ts'], addedLines: [], password: '' }),
      [],
    );
  });

  it('flags env files, archives, app binaries and run output', async () => {
    const { findPrivateViolations } = await load();
    const files = ['.env', 'cfg/.env.uat', 'logs.zip', 'apps/app.apk', 'app.ipa', 'test-results/a.xml', 'allure-results/x', 'allure-report/i.html', 'shared-errors/e.xml'];
    const found = findPrivateViolations({ trackedFiles: [...files, '.env.example'], addedLines: [], password: '' });
    assert.deepEqual(
      found.map((v) => v.where),
      files,
    );
  });

  it('flags an unpushed line that adds the password, without printing it', async () => {
    const { findPrivateViolations } = await load();
    const password = 'Sup3r-secret';
    const found = findPrivateViolations({
      trackedFiles: [],
      addedLines: [
        { commit: '1234567890abc', file: 'src/data/user.factory.ts', line: `const p = '${password}';` },
        { commit: '1234567890abc', file: 'src/data/user.factory.ts', line: `again ${password}` },
      ],
      password,
    });
    assert.deepEqual(found, [{ kind: 'password', where: '1234567 src/data/user.factory.ts' }]);
    assert.ok(!JSON.stringify(found).includes(password));
  });

  it('skips the password check below the minimum length', async () => {
    const { findPrivateViolations, MIN_PASSWORD_LENGTH } = await load();
    assert.equal(MIN_PASSWORD_LENGTH, 6);
    const found = findPrivateViolations({
      trackedFiles: [],
      addedLines: [{ commit: '1234567890abc', file: 'a.ts', line: 'abc' }],
      password: 'abc',
    });
    assert.deepEqual(found, []);
  });
});

describe('passwordFromEnv', () => {
  it('reads AUTH_PASSWORD, trimming spaces and matching quotes', async () => {
    const { passwordFromEnv } = await load();
    assert.equal(passwordFromEnv('AUT=uat\nAUTH_PASSWORD= "p@ss w0rd" \n'), 'p@ss w0rd');
    assert.equal(passwordFromEnv("AUTH_PASSWORD='abc123'"), 'abc123');
    assert.equal(passwordFromEnv('AUTH_PASSWORD=plain\r\n'), 'plain');
  });

  it('returns an empty string when AUTH_PASSWORD is absent', async () => {
    const { passwordFromEnv } = await load();
    assert.equal(passwordFromEnv('AUT=uat\n'), '');
  });
});
