export type DiffFileSummary = {
  path: string;
  oldPath?: string;
  status?: string;
  added: number;
  deleted: number;
  lines: string[];
  patchOmitted?: boolean;
  sizeBytes?: number;
};

export type DiffRemainingFileSummary = {
  path: string;
  oldPath?: string;
  status?: string;
  added: number;
  deleted: number;
  sizeBytes?: number;
};

export type DiffSummary = {
  files: DiffFileSummary[];
  remainingFiles?: DiffRemainingFileSummary[];
  totalFiles?: number;
  tooLargeFiles?: number;
  truncated?: boolean;
  added: number;
  deleted: number;
};

export type DiffHunkMetadata = {
  header: string;
  oldStart?: number;
  oldLines?: number;
  newStart?: number;
  newLines?: number;
};

export type ElevoDiffContent = {
  body?: unknown;
  diff?: unknown;
  summary?: unknown;
  files?: unknown;
  remainingFiles?: unknown;
  limits?: unknown;
};

type StructuredDiffFile = {
  path: string;
  oldPath?: string;
  status: 'added' | 'deleted' | 'renamed' | 'modified' | 'unknown';
  added: number;
  deleted: number;
  hunks: DiffHunkMetadata[];
  tooLarge: boolean;
  sizeBytes: number;
  patch?: string;
};

type StructuredDiffSummary = {
  files: number;
  detailedFiles: number;
  remainingFiles: number;
  tooLargeFiles: number;
  added: number;
  deleted: number;
  truncated: boolean;
};

export const UNKNOWN_FILE = 'Unknown files';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseStructuredSummary(value: unknown): StructuredDiffSummary | undefined {
  if (!isRecord(value)) return undefined;
  const files = getNumber(value.files);
  const detailedFiles = getNumber(value.detailedFiles);
  const remainingFiles = getNumber(value.remainingFiles);
  const tooLargeFiles = getNumber(value.tooLargeFiles);
  const added = getNumber(value.added);
  const deleted = getNumber(value.deleted);
  const truncated = typeof value.truncated === 'boolean' ? value.truncated : undefined;
  if (
    files === undefined ||
    detailedFiles === undefined ||
    remainingFiles === undefined ||
    tooLargeFiles === undefined ||
    added === undefined ||
    deleted === undefined ||
    truncated === undefined
  ) {
    return undefined;
  }

  return { files, detailedFiles, remainingFiles, tooLargeFiles, added, deleted, truncated };
}

function parseHunks(value: unknown): DiffHunkMetadata[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((hunk): DiffHunkMetadata | undefined => {
      if (!isRecord(hunk)) return undefined;
      const header = getString(hunk.header);
      if (!header) return undefined;
      return {
        header,
        oldStart: getNumber(hunk.oldStart),
        oldLines: getNumber(hunk.oldLines),
        newStart: getNumber(hunk.newStart),
        newLines: getNumber(hunk.newLines),
      };
    })
    .filter((hunk): hunk is DiffHunkMetadata => hunk !== undefined);
}

function parseStructuredFile(value: unknown): StructuredDiffFile | undefined {
  if (!isRecord(value)) return undefined;
  const path = getString(value.path);
  const status = getString(value.status);
  const added = getNumber(value.added);
  const deleted = getNumber(value.deleted);
  const tooLarge = typeof value.tooLarge === 'boolean' ? value.tooLarge : undefined;
  const sizeBytes = getNumber(value.sizeBytes);
  if (
    !path ||
    !status ||
    added === undefined ||
    deleted === undefined ||
    tooLarge === undefined ||
    sizeBytes === undefined
  ) {
    return undefined;
  }

  return {
    path,
    oldPath: getString(value.oldPath),
    status: ['added', 'deleted', 'renamed', 'modified', 'unknown'].includes(status)
      ? (status as StructuredDiffFile['status'])
      : 'unknown',
    added,
    deleted,
    hunks: parseHunks(value.hunks),
    tooLarge,
    sizeBytes,
    patch: getString(value.patch),
  };
}

function parseRemainingFile(value: unknown): DiffRemainingFileSummary | undefined {
  if (!isRecord(value)) return undefined;
  const path = getString(value.path);
  const added = getNumber(value.added);
  const deleted = getNumber(value.deleted);
  if (!path || added === undefined || deleted === undefined) return undefined;
  return {
    path,
    oldPath: getString(value.oldPath),
    status: getString(value.status),
    added,
    deleted,
    sizeBytes: getNumber(value.sizeBytes),
  };
}

function buildOmittedPatchLines(file: StructuredDiffFile): string[] {
  return [
    ...file.hunks.map((hunk) => hunk.header),
    `# Patch omitted for ${file.path}: +${file.added} -${file.deleted}`,
  ];
}

export function summarizeElevoDiffContent(content: ElevoDiffContent): DiffSummary | undefined {
  const structuredSummary = parseStructuredSummary(content.summary);
  const structuredFiles = Array.isArray(content.files)
    ? content.files.map(parseStructuredFile).filter((file): file is StructuredDiffFile => !!file)
    : [];

  if (structuredSummary && structuredFiles.length === structuredSummary.detailedFiles) {
    const remainingFiles = Array.isArray(content.remainingFiles)
      ? content.remainingFiles
          .map(parseRemainingFile)
          .filter((file): file is DiffRemainingFileSummary => !!file)
      : [];

    return {
      files: structuredFiles.map((file) => ({
        path: file.path,
        oldPath: file.oldPath,
        status: file.status,
        added: file.added,
        deleted: file.deleted,
        lines: file.patch ? file.patch.split('\n') : buildOmittedPatchLines(file),
        patchOmitted: !file.patch,
        sizeBytes: file.sizeBytes,
      })),
      remainingFiles,
      totalFiles: structuredSummary.files,
      tooLargeFiles: structuredSummary.tooLargeFiles,
      truncated: structuredSummary.truncated,
      added: structuredSummary.added,
      deleted: structuredSummary.deleted,
    };
  }

  if (typeof content.diff === 'string' && content.diff.length > 0) {
    return summarizeUnifiedDiff(content.diff);
  }

  return undefined;
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
    totalFiles: files.length > 0 ? files.length : 1,
    added,
    deleted,
  };
}
