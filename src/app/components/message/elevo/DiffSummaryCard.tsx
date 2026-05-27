import React, { CSSProperties, useMemo } from 'react';
import { Box, Text } from 'folds';
import * as css from './DiffSummaryCard.css';
import { summarizeUnifiedDiff } from './diffSummary';

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

type DiffSummaryCardProps = {
  diff: string;
  style?: CSSProperties;
};

export function DiffSummaryCard({ diff, style }: DiffSummaryCardProps) {
  const summary = useMemo(() => summarizeUnifiedDiff(diff), [diff]);
  const title =
    summary.files.length === 1
      ? `编辑了 1 个文件：${summary.files[0].path}`
      : `编辑了 ${summary.files.length} 个文件`;

  return (
    <Box className={css.DiffSummaryCard} style={style} direction="Column" gap="200">
      <div className={css.Header}>
        <div className={css.HeaderIcon} />
        <Text className={css.Title} size="T300" truncate>
          {title}
        </Text>
        <DiffLineCount added={summary.added} deleted={summary.deleted} />
      </div>
      <div className={css.FileList}>
        {summary.files.map((file) => (
          <div className={css.FileRow} key={file.path}>
            <div className={css.FilePath} title={file.path}>
              {file.path}
            </div>
            <DiffLineCount added={file.added} deleted={file.deleted} />
          </div>
        ))}
      </div>
    </Box>
  );
}
