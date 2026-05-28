import React, { CSSProperties, KeyboardEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Icon, Icons, Text } from 'folds';
import * as css from './DiffSummaryCard.css';
import { summarizeUnifiedDiff, UNKNOWN_FILE } from './diffSummary';
import { FileDiffIcon } from '../../../icons/FileDiffIcon';

type DiffLineCountProps = {
  added: number;
  deleted: number;
};

function DiffLineCount({ added, deleted }: DiffLineCountProps) {
  return (
    <span className={css.LineCount}>
      <span className={css.Added}>+{added}</span>
      <span className={css.Deleted}>-{deleted}</span>
    </span>
  );
}

function getDiffLineClassName(line: string): string | undefined {
  if (line.startsWith('+') && !line.startsWith('+++ ')) return css.DiffLineAdded;
  if (line.startsWith('-') && !line.startsWith('--- ')) return css.DiffLineDeleted;
  if (
    line.startsWith('@@') ||
    line.startsWith('diff --git ') ||
    line.startsWith('+++ ') ||
    line.startsWith('--- ')
  ) {
    return css.DiffLineMeta;
  }
  return undefined;
}

type DiffSummaryCardProps = {
  diff: string;
  style?: CSSProperties;
};

export function DiffSummaryCard({ diff, style }: DiffSummaryCardProps) {
  const { t } = useTranslation();
  const summary = useMemo(() => summarizeUnifiedDiff(diff), [diff]);
  const [expandedFiles, setExpandedFiles] = useState<ReadonlySet<string>>(() => new Set());
  const fileLabel = (path: string) => (path === UNKNOWN_FILE ? t('message.diffUnknownFile') : path);
  const title =
    summary.files.length === 1
      ? t('message.diffEditedOneFile', { path: fileLabel(summary.files[0].path) })
      : t('message.diffEditedFiles', { count: summary.files.length });

  const toggleFile = (path: string) => {
    setExpandedFiles((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const onFileRowKeyDown = (evt: KeyboardEvent<HTMLDivElement>, path: string) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      toggleFile(path);
    }
  };

  return (
    <Box className={css.DiffSummaryCard} style={style} direction="Column" gap="200">
      <div className={css.Header}>
        <Icon className={css.HeaderIcon} src={FileDiffIcon} size="100" />
        <Text className={css.Title} size="T300" truncate>
          {title}
        </Text>
        <DiffLineCount added={summary.added} deleted={summary.deleted} />
      </div>
      <div className={css.FileList}>
        {summary.files.map((file) => {
          const expanded = expandedFiles.has(file.path);
          const label = fileLabel(file.path);
          return (
            <div className={css.FileItem} key={file.path}>
              <div
                className={css.FileRow}
                onClick={() => toggleFile(file.path)}
                onKeyDown={(evt) => onFileRowKeyDown(evt, file.path)}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                aria-label={t(expanded ? 'message.collapseFileDiff' : 'message.expandFileDiff', {
                  path: label,
                })}
              >
                <div className={css.FilePath} title={label}>
                  {label}
                </div>
                <div className={css.FileMeta}>
                  <DiffLineCount added={file.added} deleted={file.deleted} />
                  <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="50" />
                </div>
              </div>
              {expanded && file.lines.length > 0 && (
                <div className={css.DiffDetails}>
                  <pre className={css.DiffBlock}>
                    {file.lines.map((line, index) => {
                      const lineClassName = getDiffLineClassName(line);
                      return (
                        <span
                          className={`${css.DiffLine}${lineClassName ? ` ${lineClassName}` : ''}`}
                          // eslint-disable-next-line react/no-array-index-key
                          key={`${index}:${line}`}
                        >
                          {`${line}\n`}
                        </span>
                      );
                    })}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Box>
  );
}
