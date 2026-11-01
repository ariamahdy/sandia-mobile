import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type AddedLine = { commit: string; file: string; line: string };
type Violation = { kind: string; where: string; detail?: string };
type GuardInput = {
  trackedFiles: string[];
  readFile: (path: string) => string | null;
  addedLines: AddedLine[];
  denylist: RegExp[];
  workflows: { file: string; text: string }[];
};
type GuardModule = { findViolations: (input: GuardInput) => Violation[] };

const load = async () => (await import(pathToFileURL(resolve('scripts/lib/guard-core.mjs')).href)) as GuardModule;

const SHA = 'a'.repeat(40);
const input = (overrides: Partial<GuardInput> = {}): GuardInput => ({
  trackedFiles: ['README.md', '.env.example', 'src/config/env.ts'],
  readFile: () => 'clean text\n',
  addedLines: [],
  denylist: [/\bforbiddenterm\b/i],
  workflows: [],
  ...overrides,
});

describe('findViolations', () => {
  it('returns nothing for a clean repository', async () => {
    const { findViolations } = await load();
    assert.deepEqual(findViolations(input()), []);
  });

  it('flags a tracked private/ path', async () => {
    const { findViolations } = await load();
    assert.deepEqual(findViolations(input({ trackedFiles: ['private/src/a.ts'] })), [
      { kind: 'private', where: 'private/src/a.ts' },
    ]);
  });

  it('flags env files but allows .env.example', async () => {
    const { findViolations } = await load();
    const found = findViolations(input({ trackedFiles: ['.env', '.env.local', 'config/.env.test', '.env.example'] }));
    assert.deepEqual(
      found.map((v) => v.where),
      ['.env', '.env.local', 'config/.env.test'],
    );
    assert.ok(found.every((v) => v.kind === 'env'));
  });

  it('flags app binaries', async () => {
    const { findViolations } = await load();
    const found = findViolations(input({ trackedFiles: ['apps/demo.apk', 'x.ipa', 'deep/x.AAB'], readFile: () => null }));
    assert.deepEqual(
      found.map((v) => [v.kind, v.where]),
      [
        ['binary', 'apps/demo.apk'],
        ['binary', 'x.ipa'],
        ['binary', 'deep/x.AAB'],
      ],
    );
  });

  it('flags run output folders', async () => {
    const { findViolations } = await load();
    const files = ['test-results/a.png', 'allure-results/b.json', 'allure-report/index.html', 'shared-errors/c.xml'];
    const found = findViolations(input({ trackedFiles: files }));
    assert.deepEqual(
      found.map((v) => [v.kind, v.where]),
      files.map((f) => ['output', f]),
    );
  });

  it('flags a denylist match in tracked text by file and line, without the line text', async () => {
    const { findViolations } = await load();
    const found = findViolations(
      input({ trackedFiles: ['notes.md'], readFile: () => 'ok\nsecret ForbiddenTerm here\n' }),
    );
    assert.deepEqual(found, [{ kind: 'denylist', where: 'notes.md:2', detail: '\\bforbiddenterm\\b' }]);
    assert.ok(!JSON.stringify(found).includes('secret'));
  });

  it('skips binary files and the denylist files themselves', async () => {
    const { findViolations } = await load();
    const found = findViolations(
      input({
        trackedFiles: ['image.png', 'scripts/guard.denylist.txt'],
        readFile: (path) => (path === 'image.png' ? null : 'forbiddenterm\n'),
      }),
    );
    assert.deepEqual(found, []);
  });

  it('flags a denylist match in an unpushed added line once per commit and file, without the line text', async () => {
    const { findViolations } = await load();
    const line = 'secret forbiddenterm';
    const found = findViolations(
      input({
        addedLines: [
          { commit: 'abcdef1234567', file: 'notes.md', line },
          { commit: 'abcdef1234567', file: 'notes.md', line: 'forbiddenterm again' },
          { commit: 'abcdef1234567', file: 'scripts/guard.denylist.txt', line: 'forbiddenterm' },
        ],
      }),
    );
    assert.deepEqual(found, [{ kind: 'unpushed', where: 'abcdef1 notes.md', detail: '\\bforbiddenterm\\b' }]);
    assert.ok(!JSON.stringify(found).includes('secret'));
  });

  it('flags workflow actions not pinned to a full SHA, allows local and docker actions', async () => {
    const { findViolations } = await load();
    const text = [
      'steps:',
      '  - uses: actions/checkout@v7',
      `  - uses: actions/setup-node@${SHA} # v7.1.0`,
      '  - uses: ./.github/actions/local',
      '  - uses: docker://alpine:3',
      '  - { uses: "org/action@main" }',
    ].join('\n');
    const found = findViolations(input({ workflows: [{ file: '.github/workflows/ci.yml', text }] }));
    assert.deepEqual(found, [
      { kind: 'unpinned', where: '.github/workflows/ci.yml:2', detail: 'actions/checkout@v7' },
      { kind: 'unpinned', where: '.github/workflows/ci.yml:6', detail: 'org/action@main' },
    ]);
  });
});
