import { existsSync, readFileSync } from 'node:fs';
import { trackedFiles, unpushedAddedLines } from './lib/git-diff.mjs';
import {
  findPrivateViolations,
  formatPrivateViolation,
  MIN_PASSWORD_LENGTH,
  passwordFromEnv,
} from './lib/private-guard-core.mjs';

const cwd = process.cwd();
const password = passwordFromEnv(existsSync('.env') ? readFileSync('.env', 'utf8') : '');
const checkPassword = password.length >= MIN_PASSWORD_LENGTH;
const tracked = trackedFiles(cwd);

const problems = findPrivateViolations({
  trackedFiles: tracked,
  addedLines: checkPassword ? unpushedAddedLines(cwd) : [],
  password,
}).map(formatPrivateViolation);

if (problems.length > 0) {
  for (const problem of problems) console.error(`private-guard: ${problem}`);
  process.exit(1);
}
const note = checkPassword ? '' : `, password check skipped (no AUTH_PASSWORD of ${String(MIN_PASSWORD_LENGTH)}+ characters in .env)`;
console.log(`private-guard: ok (${String(tracked.length)} tracked files${note})`);
