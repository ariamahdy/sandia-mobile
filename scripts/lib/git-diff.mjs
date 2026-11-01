import { execFileSync } from 'node:child_process';

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'core.quotePath=false', '-c', 'color.ui=never', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });

export const trackedFiles = (cwd) => git(cwd, 'ls-files', '-z').split('\0').filter(Boolean);

const hasHead = (cwd) => {
  try {
    git(cwd, 'rev-parse', '--verify', '-q', 'HEAD');
    return true;
  } catch {
    return false;
  }
};

export function unpushedAddedLines(cwd) {
  if (!hasHead(cwd)) return [];
  const commits = git(cwd, 'rev-list', 'HEAD', '--branches', '--not', '--remotes=origin').split('\n').filter(Boolean);
  const added = [];
  for (const commit of commits) {
    let file = '';
    let previous = '';
    const diff = git(
      cwd,
      'show',
      '--format=',
      '--diff-merges=first-parent',
      '--unified=0',
      '--no-color',
      '--no-ext-diff',
      '--no-textconv',
      '--src-prefix=a/',
      '--dst-prefix=b/',
      commit,
    );
    for (const line of diff.split('\n')) {
      const header = line.startsWith('+++ ') && previous.startsWith('--- ');
      previous = line;
      if (header) {
        file = line.startsWith('+++ b/') ? line.slice(6).replace(/\t$/, '') : '';
        continue;
      }
      if (line.startsWith('+') && file !== '') added.push({ commit, file, line: line.slice(1) });
    }
  }
  return added;
}
