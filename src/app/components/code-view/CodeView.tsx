import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Header, Icon, IconButton, Icons, Scroll, Text, as } from 'folds';
import type { ThemedToken } from 'shiki';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import * as css from './CodeView.css';
import type { CodeViewPayload } from './types';
import { UNKNOWN_FILE } from '../message/elevo/diffSummary';
import { useTheme } from '../../hooks/useTheme';
import {
  codeToTokensBase,
  getPlainTokenLines,
  getShikiThemeName,
  getTokenStyle,
  type HighlightedTokenLines,
} from '../../plugins/shiki';

type DiffRowType = 'add' | 'delete' | 'context';

type DiffCodeRow = {
  type: DiffRowType;
  oldLine?: number;
  newLine?: number;
  code: string;
  rowIndex: number;
};

type DiffHunkRow = {
  type: 'hunk';
  header: string;
};

type DiffRow = DiffCodeRow | DiffHunkRow;

type DiffHunk = {
  rows: DiffCodeRow[];
};

type ParsedDiffRows = {
  rows: DiffRow[];
  codeRows: DiffCodeRow[];
  hunks: DiffHunk[];
  showLineNumbers: boolean;
};

const hunkHeaderRegex = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

function isDiffMetadataLine(line: string): boolean {
  return (
    line.startsWith('diff --git ') ||
    line.startsWith('index ') ||
    line.startsWith('--- ') ||
    line.startsWith('+++ ') ||
    line.startsWith('new file mode ') ||
    line.startsWith('deleted file mode ') ||
    line.startsWith('old mode ') ||
    line.startsWith('new mode ') ||
    line.startsWith('similarity index ') ||
    line.startsWith('dissimilarity index ') ||
    line.startsWith('rename from ') ||
    line.startsWith('rename to ') ||
    line.startsWith('copy from ') ||
    line.startsWith('copy to ') ||
    line.startsWith('\\ No newline at end of file')
  );
}

function parseDiffRows(lines: string[]): ParsedDiffRows {
  const rows: DiffRow[] = [];
  const codeRows: DiffCodeRow[] = [];
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | undefined;
  let oldLine = 0;
  let newLine = 0;
  let hasParsedHunk = false;
  let showLineNumbers = false;

  const getCurrentHunk = (): DiffHunk => {
    if (!currentHunk) {
      currentHunk = { rows: [] };
      hunks.push(currentHunk);
    }
    return currentHunk;
  };

  const pushCodeRow = (row: Omit<DiffCodeRow, 'rowIndex'>): void => {
    const codeRow: DiffCodeRow = { ...row, rowIndex: rows.length };
    rows.push(codeRow);
    codeRows.push(codeRow);
    getCurrentHunk().rows.push(codeRow);
  };

  lines.forEach((line) => {
    const hunkMatch = hunkHeaderRegex.exec(line);
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1]);
      newLine = Number(hunkMatch[2]);
      hasParsedHunk = true;
      showLineNumbers = true;
      currentHunk = { rows: [] };
      hunks.push(currentHunk);
      rows.push({ type: 'hunk', header: line });
      return;
    }

    if (line.startsWith('@@')) {
      hasParsedHunk = false;
      currentHunk = { rows: [] };
      hunks.push(currentHunk);
      rows.push({ type: 'hunk', header: line });
      return;
    }

    if (isDiffMetadataLine(line)) return;

    if (line.startsWith('+')) {
      pushCodeRow({
        type: 'add',
        newLine: hasParsedHunk ? newLine : undefined,
        code: line.slice(1),
      });
      if (hasParsedHunk) newLine += 1;
      return;
    }

    if (line.startsWith('-')) {
      pushCodeRow({
        type: 'delete',
        oldLine: hasParsedHunk ? oldLine : undefined,
        code: line.slice(1),
      });
      if (hasParsedHunk) oldLine += 1;
      return;
    }

    const code = line.startsWith(' ') ? line.slice(1) : line;
    pushCodeRow({
      type: 'context',
      oldLine: hasParsedHunk ? oldLine : undefined,
      newLine: hasParsedHunk ? newLine : undefined,
      code,
    });
    if (hasParsedHunk) {
      oldLine += 1;
      newLine += 1;
    }
  });

  return { rows, codeRows, hunks, showLineNumbers };
}

async function highlightCodeRows(
  path: string,
  theme: string,
  rows: DiffCodeRow[]
): Promise<HighlightedTokenLines> {
  const code = rows.map((row) => row.code).join('\n');
  if (code.length === 0) return [];

  try {
    return await codeToTokensBase({ code, path, theme });
  } catch {
    return getPlainTokenLines(code);
  }
}

async function highlightDiffHunks(
  path: string,
  theme: string,
  hunks: DiffHunk[],
  rowCount: number
): Promise<HighlightedTokenLines> {
  const tokenLinesByRowIndex: HighlightedTokenLines = Array.from({ length: rowCount }, () => []);

  await Promise.all(
    hunks.map(async (hunk) => {
      const oldRows = hunk.rows.filter((row) => row.type === 'delete' || row.type === 'context');
      const newRows = hunk.rows.filter((row) => row.type === 'add' || row.type === 'context');
      const [oldTokenLines, newTokenLines] = await Promise.all([
        highlightCodeRows(path, theme, oldRows),
        highlightCodeRows(path, theme, newRows),
      ]);

      oldRows.forEach((row, index) => {
        if (row.type === 'delete') tokenLinesByRowIndex[row.rowIndex] = oldTokenLines[index] ?? [];
      });

      newRows.forEach((row, index) => {
        tokenLinesByRowIndex[row.rowIndex] = newTokenLines[index] ?? [];
      });
    })
  );

  return tokenLinesByRowIndex;
}

type DiffLineCountProps = {
  added: number;
  deleted: number;
};

export function DiffLineCount({ added, deleted }: DiffLineCountProps) {
  return (
    <span className={css.LineCount}>
      <span className={css.Added}>+{added}</span>
      <span className={css.Deleted}>-{deleted}</span>
    </span>
  );
}

type HighlightedDiffProps = {
  path: string;
  lines: string[];
};

function HighlightedDiff({ path, lines }: HighlightedDiffProps) {
  const theme = useTheme();
  const { rows, codeRows, hunks, showLineNumbers } = useMemo(() => parseDiffRows(lines), [lines]);
  const [tokenLines, setTokenLines] = useState<HighlightedTokenLines>([]);

  useEffect(() => {
    let alive = true;
    const shikiTheme = getShikiThemeName(theme.kind);

    highlightDiffHunks(path, shikiTheme, hunks, rows.length)
      .then((result) => {
        if (alive) setTokenLines(result);
      });

    return () => {
      alive = false;
    };
  }, [path, hunks, rows.length, theme.kind]);

  if (codeRows.length === 0) {
    return (
      <div className={css.CodeBlock}>
        <Text className={css.NoCode} priority="300">
          No code lines
        </Text>
      </div>
    );
  }

  return (
    <div className={css.CodeBlock}>
      <pre className={css.CodePre}>
        <code className={css.CodeGrid}>
          {rows.map((row, rowIndex) => {
            if (row.type === 'hunk') {
              return (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={`hunk:${rowIndex}`}
                  className={css.HunkHeader({ lineNumbers: showLineNumbers })}
                >
                  {showLineNumbers && (
                    <>
                      <span className={css.LineNumber} />
                      <span className={css.LineNumber} />
                    </>
                  )}
                  <span className={css.LineCode}>{row.header}</span>
                </span>
              );
            }

            return (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={`${row.oldLine ?? ''}:${row.newLine ?? ''}:${rowIndex}`}
                className={css.CodeLine({
                  diff: row.type,
                  lineNumbers: showLineNumbers,
                })}
              >
                {showLineNumbers && (
                  <>
                    <span className={css.LineNumber}>{row.oldLine ?? ''}</span>
                    <span className={css.LineNumber}>{row.newLine ?? ''}</span>
                  </>
                )}
                <span className={css.LineCode}>
                  {(tokenLines[row.rowIndex] ?? [{ content: row.code } as ThemedToken]).map(
                    (token, tokenIndex) => (
                      <span
                        // eslint-disable-next-line react/no-array-index-key
                        key={tokenIndex}
                        style={getTokenStyle(token)}
                      >
                        {token.content}
                      </span>
                    )
                  )}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

type CodeViewProps = {
  payload: CodeViewPayload;
  hideCloseButton?: boolean;
  requestClose: () => void;
};

export const CodeView = as<'div', CodeViewProps>(
  ({ className, payload, hideCloseButton, requestClose, ...props }, ref) => {
    const { t } = useTranslation();
    const [expandedFiles, setExpandedFiles] = useState<ReadonlySet<string>>(
      () => new Set(payload.files.map((file) => file.path))
    );

    useEffect(() => {
      setExpandedFiles(new Set(payload.files.map((file) => file.path)));
    }, [payload.files]);

    const allExpanded = expandedFiles.size === payload.files.length;
    const title =
      payload.title ??
      (payload.files.length === 1
        ? payload.files[0].path
        : t('message.diffEditedFiles', { count: payload.files.length }));

    const fileLabel = (path: string) =>
      path === UNKNOWN_FILE ? t('message.diffUnknownFile') : path;

    const toggleAll = () => {
      setExpandedFiles(allExpanded ? new Set() : new Set(payload.files.map((file) => file.path)));
    };

    const toggleFile = (path: string) => {
      setExpandedFiles((current) => {
        const next = new Set(current);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
    };

    return (
      <Box className={classNames(css.CodeView, className)} direction="Column" {...props} ref={ref}>
        <Header className={css.Header} size="400">
          <Box grow="Yes" alignItems="Center" gap="200" className={css.HeaderTitle}>
            {!hideCloseButton && (
              <IconButton
                size="300"
                radii="300"
                onClick={requestClose}
                aria-label="Close code view"
              >
                <Icon size="50" src={Icons.ArrowLeft} />
              </IconButton>
            )}
            <Text size="T300" truncate title={title}>
              {title}
            </Text>
            <DiffLineCount added={payload.added} deleted={payload.deleted} />
          </Box>
          <div className={css.HeaderMeta}>
            <Chip variant="Secondary" radii="300" onClick={toggleAll}>
              <Text size="B300">{allExpanded ? 'Collapse all' : 'Expand all'}</Text>
            </Chip>
          </div>
        </Header>

        <Box grow="Yes" className={css.Content}>
          <Scroll hideTrack variant="Background" visibility="Hover">
            <div className={css.ScrollContent}>
              {payload.files.length > 0 ? (
                <div className={css.FileList}>
                  {payload.files.map((file) => {
                    const expanded = expandedFiles.has(file.path);
                    const label = fileLabel(file.path);
                    return (
                      <section className={css.FilePanel} key={file.path}>
                        <button
                          className={css.FileHeader}
                          type="button"
                          onClick={() => toggleFile(file.path)}
                          aria-expanded={expanded}
                        >
                          <Text as="span" size="T200" className={css.FilePath} title={label}>
                            {label}
                          </Text>
                          <span className={css.FileMeta}>
                            <DiffLineCount added={file.added} deleted={file.deleted} />
                            <Icon
                              src={expanded ? Icons.ChevronBottom : Icons.ChevronRight}
                              size="50"
                            />
                          </span>
                        </button>
                        {expanded && file.lines.length > 0 && (
                          <HighlightedDiff path={file.path} lines={file.lines} />
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <Box className={css.Empty} alignItems="Center" justifyContent="Center">
                  <Text priority="300">No diff content</Text>
                </Box>
              )}
            </div>
          </Scroll>
        </Box>
      </Box>
    );
  }
);
