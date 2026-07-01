import { readFileSync } from 'node:fs';

let cachedGitCommit = null;

export function readGitCommit() {
  if (cachedGitCommit) {
    return cachedGitCommit;
  }

  if (process.env.DFAQ_GIT_COMMIT?.trim()) {
    cachedGitCommit = process.env.DFAQ_GIT_COMMIT.trim();
    return cachedGitCommit;
  }

  for (const path of ['/app/.git-commit', '.git-commit']) {
    try {
      cachedGitCommit = readFileSync(path, 'utf8').trim();
      if (cachedGitCommit) {
        return cachedGitCommit;
      }
    } catch {
      /* try next */
    }
  }

  cachedGitCommit = 'unknown';
  return cachedGitCommit;
}
