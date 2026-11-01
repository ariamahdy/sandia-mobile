import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { trackedFiles, unpushedAddedLines } from './lib/git-diff.mjs';
import { DENYLIST_FILES, findViolations, formatViolation } from './lib/guard-core.mjs';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

const denylist = DENYLIST_FILES.map((file) => join(root, file))
  .filter((path) => existsSync(path))
  .flatMap((path) => readFileSync(path, 'utf8').split('\n'))
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))
  .map((line) => new RegExp(line, 'i'));

const readFile = (file) => {
  const path = join(root, file);
  if (!existsSync(path) || !lstatSync(path).isFile()) return null;
  const content = readFileSync(path);
  return content.includes(0) ? null : content.toString('utf8');
};

const tracked = trackedFiles(root);
const workflows = tracked
  .filter((file) => /^\.github\/(workflows\/[^/]+|actions\/.+\/action)\.ya?ml$/.test(file))
  .map((file) => ({ file, text: readFile(file) ?? '' }));

const problems = findViolations({
  trackedFiles: tracked,
  readFile,
  addedLines: unpushedAddedLines(root),
  denylist,
  workflows,
}).map(formatViolation);

if (problems.length > 0) {
  console.error(`guard: ${String(problems.length)} problem(s)\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`guard: ok (${String(tracked.length)} tracked files, ${String(denylist.length)} denylist patterns)`);
