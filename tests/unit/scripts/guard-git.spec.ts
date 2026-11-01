import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type AddedLine = { commit: string; file: string; line: string };
type GitModule = { unpushedAddedLines: (cwd: string) => AddedLine[] };

const load = async () => (await import(pathToFileURL(resolve('scripts/lib/git-diff.mjs')).href)) as GitModule;
const guard = resolve('scripts/guard.mjs');

type Repo = { dir: string; git: (...args: string[]) => string; write: (path: string, text: string) => void };

const makeRepo = (root: string): Repo => {
  const dir = join(root, 'work');
  execFileSync('git', ['init', '-q', '--bare', join(root, 'remote.git')]);
  execFileSync('git', ['init', '-q', '-b', 'main', dir]);
  const git = (...args: string[]): string =>
    execFileSync(
      'git',
      ['-c', 'user.name=t', '-c', 'user.email=t@t.test', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args],
      { cwd: dir, encoding: 'utf8' },
    );
  const write = (path: string, text: string): void => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  git('remote', 'add', 'origin', join(root, 'remote.git'));
  git('config', 'diff.noprefix', 'true');
  git('config', 'color.diff', 'always');
  git('config', 'core.quotePath', 'true');
  write('scripts/guard.denylist.txt', '\\bforbiddenterm\\b\n');
  write('README.md', 'clean\n');
  git('add', '.');
  git('commit', '-q', '-m', 'init');
  git('push', '-q', 'origin', 'main');
  return { dir, git, write };
};

const addAndRemove = (repo: Repo, file: string): string => {
  repo.write(file, 'has forbiddenterm here\n');
  repo.git('add', '--', file);
  repo.git('commit', '-q', '-m', 'add');
  const sha = repo.git('rev-parse', 'HEAD').trim();
  repo.write(file, 'clean again\n');
  repo.git('commit', '-q', '-am', 'remove');
  return sha;
};

describe('unpushedAddedLines and the guard CLI', () => {
  let root: string;
  let repo: Repo;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sandia-guard-'));
    repo = makeRepo(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns lines added in unpushed commits, with plain paths despite hostile git config', async () => {
    const { unpushedAddedLines } = await load();
    const sha = addAndRemove(repo, 'docs/my notés.md');
    const lines = unpushedAddedLines(repo.dir);
    assert.ok(lines.some((l) => l.commit === sha && l.file === 'docs/my notés.md' && l.line === 'has forbiddenterm here'));
  });

  it('ignores commits already on the remote', async () => {
    const { unpushedAddedLines } = await load();
    addAndRemove(repo, 'notes.md');
    repo.git('push', '-q', 'origin', 'main');
    assert.deepEqual(unpushedAddedLines(repo.dir), []);
  });

  it('covers unpushed side branches', async () => {
    const { unpushedAddedLines } = await load();
    repo.git('checkout', '-q', '-b', 'side');
    const sha = addAndRemove(repo, 'side.md');
    repo.git('checkout', '-q', 'main');
    assert.ok(unpushedAddedLines(repo.dir).some((l) => l.commit === sha));
  });

  it('guard fails on a term added and removed before a push, and never prints the line', () => {
    const sha = addAndRemove(repo, 'notes.md');
    const result = spawnSync(process.execPath, [guard], { cwd: repo.dir, encoding: 'utf8' });
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 1, output);
    assert.ok(output.includes(`${sha.slice(0, 7)} notes.md: matches denylist pattern /\\bforbiddenterm\\b/`), output);
    assert.ok(!output.includes('has forbiddenterm here'), output);
  });

  it('guard passes on a clean repository', () => {
    const result = spawnSync(process.execPath, [guard], { cwd: repo.dir, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  });
});
