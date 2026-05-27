export type DiffFileSummary = {
  path: string;
  added: number;
  deleted: number;
};

export type DiffSummary = {
  files: DiffFileSummary[];
  added: number;
  deleted: number;
};

const UNKNOWN_FILE = 'Unknown files';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  let added = 0;
  let deleted = 0;

  const getCurrentFile = (): DiffFileSummary => {
    if (!currentFile) {
      currentFile = { path: UNKNOWN_FILE, added: 0, deleted: 0 };
      files.push(currentFile);
    }
    return currentFile;
  };

  const setCurrentFile = (path: string | undefined): void => {
    if (!path) return;

    currentFile = files.find((file) => file.path === path);
    if (!currentFile) {
      currentFile = { path, added: 0, deleted: 0 };
      files.push(currentFile);
    }
  };

  diff.split('\n').forEach((line) => {
    if (line.startsWith('diff --git ')) {
      setCurrentFile(parseGitDiffFile(line));
      return;
    }

    if (line.startsWith('+++ ')) {
      setCurrentFile(normalizeDiffFile(line.slice(4)));
      return;
    }

    if (line.startsWith('+') && !line.startsWith('+++ ')) {
      const file = getCurrentFile();
      file.added += 1;
      added += 1;
      return;
    }

    if (line.startsWith('-') && !line.startsWith('--- ')) {
      const file = getCurrentFile();
      file.deleted += 1;
      deleted += 1;
    }
  });

  return {
    files: files.length > 0 ? files : [{ path: UNKNOWN_FILE, added, deleted }],
    added,
    deleted,
  };
}

export function parseDiffContent(content: Record<string, unknown>): string | undefined {
  const diffContent = content['vip.elevo.diff'];
  if (!isRecord(diffContent)) return undefined;

  const { diff } = diffContent;
  return typeof diff === 'string' && diff.length > 0 ? diff : undefined;
}
