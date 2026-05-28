export type DiffFileSummary = {
  path: string;
  added: number;
  deleted: number;
  lines: string[];
};

export type DiffSummary = {
  files: DiffFileSummary[];
  added: number;
  deleted: number;
};

export const UNKNOWN_FILE = 'Unknown files';

function normalizeDiffFile(file: string): string | undefined {
  const trimmed = file.trim();
  if (!trimmed || trimmed === '/dev/null') return undefined;
  return trimmed.replace(/^[ab]\//, '');
}

function parseGitDiffFile(line: string): string | undefined {
  const match =
    /^diff --git (?:"a\/((?:\\"|[^"])*)"|a\/(\S+)) (?:"b\/((?:\\"|[^"])*)"|b\/(\S+))$/.exec(line);
  const file = match?.[3] ?? match?.[4] ?? match?.[1] ?? match?.[2];
  if (!file) return undefined;
  return file.replace(/\\"/g, '"');
}

export function summarizeUnifiedDiff(diff: string): DiffSummary {
  const files: DiffFileSummary[] = [];
  let currentFile: DiffFileSummary | undefined;
  let pendingHeaderLines: string[] = [];
  let added = 0;
  let deleted = 0;

  const getCurrentFile = (): DiffFileSummary => {
    if (!currentFile) {
      currentFile = { path: UNKNOWN_FILE, added: 0, deleted: 0, lines: [] };
      files.push(currentFile);
    }
    return currentFile;
  };

  const setCurrentFile = (path: string | undefined): void => {
    if (!path) return;

    currentFile = files.find((file) => file.path === path);
    if (!currentFile) {
      currentFile = { path, added: 0, deleted: 0, lines: [] };
      files.push(currentFile);
    }
    if (pendingHeaderLines.length > 0) {
      currentFile.lines.push(...pendingHeaderLines);
      pendingHeaderLines = [];
    }
  };

  diff.split('\n').forEach((line) => {
    if (line.startsWith('diff --git ')) {
      setCurrentFile(parseGitDiffFile(line));
      getCurrentFile().lines.push(line);
      return;
    }

    if (line.startsWith('+++ ')) {
      setCurrentFile(normalizeDiffFile(line.slice(4)));
      getCurrentFile().lines.push(line);
      return;
    }

    if (line.startsWith('--- ')) {
      const oldPath = normalizeDiffFile(line.slice(4));
      if (!currentFile || !oldPath || oldPath !== currentFile.path) {
        pendingHeaderLines = [line];
      } else {
        currentFile.lines.push(line);
      }
      return;
    }

    if (line.startsWith('+') && !line.startsWith('+++ ')) {
      const file = getCurrentFile();
      file.added += 1;
      file.lines.push(line);
      added += 1;
      return;
    }

    if (line.startsWith('-') && !line.startsWith('--- ')) {
      const file = getCurrentFile();
      file.deleted += 1;
      file.lines.push(line);
      deleted += 1;
      return;
    }

    if (currentFile || line.startsWith('@@')) {
      getCurrentFile().lines.push(line);
    }
  });

  return {
    files: files.length > 0 ? files : [{ path: UNKNOWN_FILE, added, deleted, lines: [] }],
    added,
    deleted,
  };
}
