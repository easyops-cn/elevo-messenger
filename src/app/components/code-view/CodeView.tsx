import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Header, Icon, IconButton, Icons, Scroll, Text, as } from 'folds';
import type { HighlighterCore } from 'shiki/core';
import type { BundledLanguage, ThemedToken } from 'shiki';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import * as css from './CodeView.css';
import type { CodeViewPayload } from './types';
import { UNKNOWN_FILE } from '../message/elevo/diffSummary';
import { useTheme, ThemeKind } from '../../hooks/useTheme';

type LanguageBundle = typeof import('shiki/langs');

let codeHighlighterPromise: Promise<HighlighterCore> | undefined;
let languageBundlePromise: Promise<LanguageBundle> | undefined;

function getLanguageBundle(): Promise<LanguageBundle> {
  if (!languageBundlePromise) {
    languageBundlePromise = import('shiki/langs');
  }

  return languageBundlePromise;
}

function getCodeHighlighter(): Promise<HighlighterCore> {
  if (!codeHighlighterPromise) {
    codeHighlighterPromise = Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/themes/github-dark.mjs'),
      import('shiki/themes/github-light.mjs'),
    ]).then(
      ([
        { createHighlighterCore },
        { createJavaScriptRegexEngine },
        { default: githubDarkTheme },
        { default: githubLightTheme },
      ]) =>
        createHighlighterCore({
          themes: [githubDarkTheme, githubLightTheme],
          langs: [],
          engine: createJavaScriptRegexEngine(),
        })
    );
  }

  return codeHighlighterPromise;
}

const fileNameLanguageMap: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  rakefile: 'ruby',
  gemfile: 'ruby',
  cargo: 'toml',
};

function getPathLanguageCandidates(path: string): string[] {
  const fileName = path.split('/').pop()?.toLowerCase() ?? '';
  const candidates: string[] = [];
  const mappedFileName = fileNameLanguageMap[fileName];
  if (mappedFileName) candidates.push(mappedFileName);

  if (fileName.endsWith('.d.ts')) candidates.push('typescript');

  const parts = fileName.split('.').filter(Boolean);
  if (parts.length > 1) {
    const extension = parts[parts.length - 1];
    candidates.push(extension);

    if (extension === 'lock' && parts.length > 2) candidates.push(parts[parts.length - 2]);
  }

  return candidates;
}

function inferLanguage(path: string, bundle: LanguageBundle): BundledLanguage | 'text' {
  const { bundledLanguages, bundledLanguagesAlias, bundledLanguagesInfo } = bundle;
  const candidates = getPathLanguageCandidates(path);

  const language = candidates.find((candidate) => {
    if (candidate in bundledLanguages) return candidate as BundledLanguage;

    const aliasTarget = bundledLanguagesAlias[candidate as keyof typeof bundledLanguagesAlias];
    if (aliasTarget && aliasTarget in bundledLanguages) return aliasTarget as BundledLanguage;

    const info = bundledLanguagesInfo.find(
      (item) => item.id === candidate || item.aliases?.includes(candidate)
    );
    return Boolean(info?.id && info.id in bundledLanguages);
  });

  if (!language) return 'text';

  if (language in bundledLanguages) return language as BundledLanguage;

  const aliasTarget = bundledLanguagesAlias[language as keyof typeof bundledLanguagesAlias];
  if (aliasTarget && aliasTarget in bundledLanguages) return aliasTarget as BundledLanguage;

  const info = bundledLanguagesInfo.find(
    (item) => item.id === language || item.aliases?.includes(language)
  );
  if (info?.id && info.id in bundledLanguages) return info.id as BundledLanguage;

  return 'text';
}

async function ensureLanguage(
  highlighter: HighlighterCore,
  bundle: LanguageBundle,
  lang: BundledLanguage | 'text'
): Promise<void> {
  if (lang === 'text' || highlighter.getLoadedLanguages().includes(lang)) return;

  const loader = bundle.bundledLanguages[lang];
  if (!loader) return;
  const module = await loader();
  highlighter.loadLanguageSync(module.default);
}

type DiffRowType = 'add' | 'delete' | 'context';

type DiffRow = {
  type: DiffRowType;
  oldLine?: number;
  newLine?: number;
  code: string;
  hunkStart?: boolean;
};

type DiffDisplayRow = DiffRow | { type: 'separator' };

type ParsedDiffRows = {
  rows: DiffRow[];
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
  let oldLine = 0;
  let newLine = 0;
  let hasParsedHunk = false;
  let showLineNumbers = false;
  let nextCodeLineStartsHunk = false;

  lines.forEach((line) => {
    const hunkMatch = hunkHeaderRegex.exec(line);
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1]);
      newLine = Number(hunkMatch[2]);
      hasParsedHunk = true;
      showLineNumbers = true;
      nextCodeLineStartsHunk = rows.length > 0;
      return;
    }

    if (line.startsWith('@@')) {
      hasParsedHunk = false;
      nextCodeLineStartsHunk = rows.length > 0;
      return;
    }

    if (isDiffMetadataLine(line)) return;

    if (line.startsWith('+')) {
      rows.push({
        type: 'add',
        newLine: hasParsedHunk ? newLine : undefined,
        code: line.slice(1),
        hunkStart: nextCodeLineStartsHunk,
      });
      if (hasParsedHunk) newLine += 1;
      nextCodeLineStartsHunk = false;
      return;
    }

    if (line.startsWith('-')) {
      rows.push({
        type: 'delete',
        oldLine: hasParsedHunk ? oldLine : undefined,
        code: line.slice(1),
        hunkStart: nextCodeLineStartsHunk,
      });
      if (hasParsedHunk) oldLine += 1;
      nextCodeLineStartsHunk = false;
      return;
    }

    const code = line.startsWith(' ') ? line.slice(1) : line;
    rows.push({
      type: 'context',
      oldLine: hasParsedHunk ? oldLine : undefined,
      newLine: hasParsedHunk ? newLine : undefined,
      code,
      hunkStart: nextCodeLineStartsHunk,
    });
    if (hasParsedHunk) {
      oldLine += 1;
      newLine += 1;
    }
    nextCodeLineStartsHunk = false;
  });

  return { rows, showLineNumbers };
}

function getDiffDisplayRows(rows: DiffRow[]): DiffDisplayRow[] {
  return rows.flatMap((row, index) =>
    index > 0 && row.hunkStart ? ([{ type: 'separator' }, row] as DiffDisplayRow[]) : [row]
  );
}

function getTokenStyle(token: ThemedToken): React.CSSProperties {
  const fontStyle = token.fontStyle ?? 0;
  const hasStyle = (flag: number) => fontStyle > 0 && Math.floor(fontStyle / flag) % 2 === 1;

  return {
    color: token.color,
    fontStyle: hasStyle(1) ? 'italic' : undefined,
    fontWeight: hasStyle(2) ? 700 : undefined,
    textDecoration: hasStyle(4) ? 'underline' : undefined,
  };
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

type HighlightedTokenLines = ThemedToken[][];

function HighlightedDiff({ path, lines }: HighlightedDiffProps) {
  const theme = useTheme();
  const { rows, showLineNumbers } = useMemo(() => parseDiffRows(lines), [lines]);
  const displayRows = useMemo(() => getDiffDisplayRows(rows), [rows]);
  const [tokenLines, setTokenLines] = useState<HighlightedTokenLines>([]);

  useEffect(() => {
    let alive = true;
    const code = rows.map((row) => row.code).join('\n');
    const shikiTheme = theme.kind === ThemeKind.Dark ? 'github-dark' : 'github-light';

    Promise.all([getCodeHighlighter(), getLanguageBundle()])
      .then(async ([highlighter, bundle]) => {
        const lang = inferLanguage(path, bundle);
        await ensureLanguage(highlighter, bundle, lang);
        return highlighter.codeToTokensBase(code, { lang, theme: shikiTheme });
      })
      .then((result) => {
        if (alive) setTokenLines(result);
      })
      .catch(() => {
        if (alive) setTokenLines(rows.map((row) => [{ content: row.code } as ThemedToken]));
      });

    return () => {
      alive = false;
    };
  }, [path, rows, theme.kind]);

  if (rows.length === 0) {
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
          {displayRows.map((row, displayRowIndex) => {
            if (row.type === 'separator') {
              return (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={`separator:${displayRowIndex}`}
                  className={css.HunkSeparator}
                />
              );
            }

            const rowIndex = rows.indexOf(row);
            return (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={`${row.oldLine ?? ''}:${row.newLine ?? ''}:${displayRowIndex}`}
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
                  {(tokenLines[rowIndex] ?? [{ content: row.code } as ThemedToken]).map(
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
