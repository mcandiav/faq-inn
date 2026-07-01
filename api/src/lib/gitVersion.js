import { readFileSync } from 'node:fs';

let cachedGitCommit = null;

function shortenHash(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === 'unknown') {
    return trimmed || 'unknown';
  }
  return trimmed.slice(0, 7);
}

export function readGitCommit() {
  if (cachedGitCommit) {
    return cachedGitCommit;
  }

  if (process.env.DFAQ_GIT_COMMIT?.trim()) {
    cachedGitCommit = shortenHash(process.env.DFAQ_GIT_COMMIT);
    return cachedGitCommit;
  }

  for (const path of ['/app/.git-commit', '.git-commit']) {
    try {
      cachedGitCommit = shortenHash(readFileSync(path, 'utf8'));
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
