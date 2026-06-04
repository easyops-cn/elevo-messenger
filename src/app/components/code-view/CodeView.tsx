import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, Header, Icon, IconButton, Icons, Scroll, Text, as } from 'folds';
import type { ThemedToken } from 'shiki';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import * as css from './CodeView.css';
import type { CodeViewPayload } from './types';
import { FileDiffIcon } from '../../icons/FileDiffIcon';
import { CompactPath } from '../path/CompactPath';
import { UNKNOWN_FILE } from '../message/elevo/diffSummary';
import { useTheme } from '../../hooks/useTheme';
import {
  codeToTokensBase,
  getPlainTokenLines,
  getShikiThemeName,
  getTokenStyle,
  type HighlightedTokenLines,
  type ShikiThemeName,
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
  theme: ShikiThemeName,
  rows: DiffCodeRow[],
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
  theme: ShikiThemeName,
  hunks: DiffHunk[],
  rowCount: number,
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
    }),
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

type CodeViewFile = CodeViewPayload['files'][number];

type FileEntry = {
  key: string;
  file: CodeViewFile;
  label: string;
  segments: string[];
};

type FileTreeNode = {
  name: string;
  children: Map<string, FileTreeNode>;
  files: FileEntry[];
};

function createFileTreeNode(name: string): FileTreeNode {
  return { name, children: new Map(), files: [] };
}

function getPathSegments(path: string, label: string): string[] {
  if (path === UNKNOWN_FILE) return [label];
  const segments = path.split('/').filter((segment) => segment.length > 0);
  return segments.length > 0 ? segments : [label];
}

function buildFileTree(entries: FileEntry[]): FileTreeNode {
  const root = createFileTreeNode('');

  entries.forEach((entry) => {
    const parentSegments = entry.segments.slice(0, -1);
    let node = root;

    parentSegments.forEach((segment) => {
      const child = node.children.get(segment) ?? createFileTreeNode(segment);
      node.children.set(segment, child);
      node = child;
    });

    node.files.push(entry);
  });

  return root;
}

function compactDirectoryNode(node: FileTreeNode): { name: string; node: FileTreeNode } {
  let name = node.name;
  let current = node;

  while (current.files.length === 0 && current.children.size === 1) {
    const child = Array.from(current.children.values())[0];
    name = `${name}/${child.name}`;
    current = child;
  }

  return { name, node: current };
}

type FileTreeProps = {
  node: FileTreeNode;
  activeFileKey?: string;
  onSelect: (entry: FileEntry) => void;
};

function FileTree({ node, activeFileKey, onSelect }: FileTreeProps) {
  const childNodes = Array.from(node.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const files = [...node.files].sort((a, b) =>
    a.segments[a.segments.length - 1].localeCompare(b.segments[b.segments.length - 1]),
  );

  return (
    <ul className={css.TreeList}>
      {childNodes.map((child) => {
        const compacted = compactDirectoryNode(child);
        return (
          <li className={css.TreeItem} key={`dir:${compacted.name}`}>
            <div className={css.TreeDirectory}>
              <Icon src={Icons.ChevronBottom} size="50" />
              <CompactPath className={css.TreePath} path={compacted.name} />
            </div>
            <FileTree node={compacted.node} activeFileKey={activeFileKey} onSelect={onSelect} />
          </li>
        );
      })}
      {files.map((entry) => {
        return (
          <li className={css.TreeItem} key={`file:${entry.key}`}>
            <button
              className={css.TreeFileButton({ active: activeFileKey === entry.key })}
              type="button"
              title={entry.label}
              onClick={() => onSelect(entry)}
            >
              <Icon src={FileDiffIcon} size="50" />
              <CompactPath className={css.TreePath} path={entry.label} />
            </button>
          </li>
        );
      })}
    </ul>
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

    highlightDiffHunks(path, shikiTheme, hunks, rows.length).then((result) => {
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
                      <span key={tokenIndex} style={getTokenStyle(token)}>
                        {token.content}
                      </span>
                    ),
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
    const fileRefs = useRef(new Map<string, HTMLElement>());
    const [activeFileKey, setActiveFileKey] = useState<string | undefined>();
    const [pendingScrollFileKey, setPendingScrollFileKey] = useState<string | undefined>();
    const fileEntries = useMemo<FileEntry[]>(
      () =>
        payload.files.map((file, index) => {
          const label = file.path === UNKNOWN_FILE ? t('message.diffUnknownFile') : file.path;
          return {
            key: `${index}:${file.path}`,
            file,
            label,
            segments: getPathSegments(file.path, label),
          };
        }),
      [payload.files, t],
    );
    const fileTree = useMemo(() => buildFileTree(fileEntries), [fileEntries]);
    const [expandedFiles, setExpandedFiles] = useState<ReadonlySet<string>>(
      () => new Set(fileEntries.map((entry) => entry.key)),
    );

    useEffect(() => {
      setExpandedFiles(new Set(fileEntries.map((entry) => entry.key)));
      setActiveFileKey(fileEntries[0]?.key);
    }, [fileEntries]);

    useLayoutEffect(() => {
      if (!pendingScrollFileKey) return;
      fileRefs.current
        .get(pendingScrollFileKey)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      setPendingScrollFileKey(undefined);
    }, [expandedFiles, pendingScrollFileKey]);

    const allExpanded = expandedFiles.size === fileEntries.length;
    const title =
      payload.title ??
      (payload.files.length === 1
        ? payload.files[0].path
        : t('message.diffEditedFiles', { count: payload.files.length }));

    const toggleAll = () => {
      setExpandedFiles(allExpanded ? new Set() : new Set(fileEntries.map((entry) => entry.key)));
    };

    const toggleFile = (fileKey: string) => {
      setExpandedFiles((current) => {
        const next = new Set(current);
        if (next.has(fileKey)) next.delete(fileKey);
        else next.add(fileKey);
        return next;
      });
    };

    const selectFile = (entry: FileEntry) => {
      setActiveFileKey(entry.key);
      setExpandedFiles((current) => {
        if (current.has(entry.key)) return current;
        return new Set(current).add(entry.key);
      });

      window.requestAnimationFrame(() => {
        setPendingScrollFileKey(entry.key);
      });
    };

    const setFileRef = (fileKey: string) => (element: HTMLElement | null) => {
      if (element) fileRefs.current.set(fileKey, element);
      else fileRefs.current.delete(fileKey);
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
            <Icon className={css.HeaderIcon} src={FileDiffIcon} size="100" />
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
          {fileEntries.length > 0 ? (
            <div className={css.SplitContent}>
              <aside className={css.TreePane} aria-label="Changed files">
                <Scroll hideTrack visibility="Hover">
                  <div className={css.TreeContent}>
                    <FileTree node={fileTree} activeFileKey={activeFileKey} onSelect={selectFile} />
                  </div>
                </Scroll>
              </aside>
              <Scroll hideTrack variant="Background" visibility="Hover">
                <div className={css.ScrollContent}>
                  <div className={css.FileList}>
                    {fileEntries.map((entry) => {
                      const { file, label } = entry;
                      const expanded = expandedFiles.has(entry.key);
                      return (
                        <section
                          className={css.FilePanel}
                          key={entry.key}
                          ref={setFileRef(entry.key)}
                        >
                          <button
                            className={css.FileHeader}
                            type="button"
                            onClick={() => toggleFile(entry.key)}
                            aria-expanded={expanded}
                          >
                            <CompactPath className={css.FilePath} path={label} />
                            <span className={css.FileMeta}>
                              <DiffLineCount added={file.added} deleted={file.deleted} />
                              <Icon
                                src={expanded ? Icons.ChevronBottom : Icons.ChevronRight}
                                size="50"
                              />
                            </span>
                          </button>
                          {expanded &&
                            file.lines.length > 0 &&
                            (file.patchOmitted ? (
                              <div className={css.OmittedPatch}>
                                {file.lines.map((line, index) => (
                                  <Text
                                    key={`${index}:${line}`}
                                    className={css.OmittedPatchLine}
                                    priority="300"
                                  >
                                    {line}
                                  </Text>
                                ))}
                              </div>
                            ) : (
                              <HighlightedDiff path={file.path} lines={file.lines} />
                            ))}
                        </section>
                      );
                    })}
                  </div>
                </div>
              </Scroll>
            </div>
          ) : (
            <Box className={css.Empty} alignItems="Center" justifyContent="Center">
              <Text priority="300">No diff content</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  },
);
