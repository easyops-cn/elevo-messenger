import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Header, Icon, IconButton, Icons, Scroll, Text, as } from 'folds';
import type { HighlighterCore } from 'shiki/core';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import DOMPurify from 'dompurify';
import * as css from './CodeView.css';
import type { CodeViewPayload } from './types';
import { UNKNOWN_FILE } from '../message/elevo/diffSummary';
import { useTheme, ThemeKind } from '../../hooks/useTheme';

let diffHighlighterPromise: Promise<HighlighterCore> | undefined;

function getDiffHighlighter(): Promise<HighlighterCore> {
  if (!diffHighlighterPromise) {
    diffHighlighterPromise = Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/langs/diff.mjs'),
      import('shiki/themes/github-dark.mjs'),
      import('shiki/themes/github-light.mjs'),
    ]).then(
      ([
        { createHighlighterCore },
        { createJavaScriptRegexEngine },
        { default: diffLang },
        { default: githubDarkTheme },
        { default: githubLightTheme },
      ]) =>
        createHighlighterCore({
          themes: [githubDarkTheme, githubLightTheme],
          langs: [diffLang],
          engine: createJavaScriptRegexEngine(),
        })
    );
  }

  return diffHighlighterPromise;
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
  lines: string[];
};

function HighlightedDiff({ lines }: HighlightedDiffProps) {
  const theme = useTheme();
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let alive = true;
    const code = lines.join('\n');
    const shikiTheme = theme.kind === ThemeKind.Dark ? 'github-dark' : 'github-light';

    getDiffHighlighter()
      .then((highlighter) => highlighter.codeToHtml(code, { lang: 'diff', theme: shikiTheme }))
      .then((result) => {
        if (!alive) return;
        setHtml(DOMPurify.sanitize(result));
      })
      .catch(() => {
        if (!alive) return;
        setHtml(
          DOMPurify.sanitize(
            `<pre class="shiki"><code>${code
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')}</code></pre>`
          )
        );
      });

    return () => {
      alive = false;
    };
  }, [lines, theme.kind]);

  return (
    // eslint-disable-next-line react/no-danger
    <div className={css.CodeBlock} dangerouslySetInnerHTML={{ __html: html }} />
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

    const fileLabel = (path: string) => (path === UNKNOWN_FILE ? t('message.diffUnknownFile') : path);

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
      <Box
        className={classNames(css.CodeView, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.Header} size="400">
          <Box grow="Yes" alignItems="Center" gap="200" className={css.HeaderTitle}>
            {!hideCloseButton && (
              <IconButton size="300" radii="300" onClick={requestClose} aria-label="Close code view">
                <Icon size="50" src={Icons.ArrowLeft} />
              </IconButton>
            )}
            <Text size="T300" truncate title={title}>
              {title}
            </Text>
          </Box>
          <div className={css.HeaderMeta}>
            <Text size="T200" priority="300">
              {payload.files.length} {payload.files.length === 1 ? 'file' : 'files'}
            </Text>
            <DiffLineCount added={payload.added} deleted={payload.deleted} />
            <Chip variant="Primary" radii="300" onClick={toggleAll}>
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
                            <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="50" />
                          </span>
                        </button>
                        {expanded && file.lines.length > 0 && <HighlightedDiff lines={file.lines} />}
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
