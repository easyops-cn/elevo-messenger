import React, { CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Icon, Text } from 'folds';
import * as css from './DiffSummaryCard.css';
import { summarizeUnifiedDiff, UNKNOWN_FILE } from './diffSummary';
import { FileDiffIcon } from '../../../icons/FileDiffIcon';
import { useOpenCodeView } from '../../../utils/codeView';

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
  const { t } = useTranslation();
  const openCodeView = useOpenCodeView();
  const summary = useMemo(() => summarizeUnifiedDiff(diff), [diff]);
  const fileLabel = (path: string) => (path === UNKNOWN_FILE ? t('message.diffUnknownFile') : path);
  const title =
    summary.files.length === 1
      ? t('message.diffEditedOneFile', { path: fileLabel(summary.files[0].path) })
      : t('message.diffEditedFiles', { count: summary.files.length });

  const openDiff = () => {
    openCodeView({ title, files: summary.files, added: summary.added, deleted: summary.deleted });
  };

  return (
    <Box className={css.DiffSummaryCard} style={style} direction="Column" gap="200">
      <div className={css.Header}>
        <Icon className={css.HeaderIcon} src={FileDiffIcon} size="100" />
        <div className={css.TitleGroup}>
          <Text className={css.Title} size="T300" truncate>
            {title}
          </Text>
          <DiffLineCount added={summary.added} deleted={summary.deleted} />
        </div>
        <Button size="300" radii="300" variant="Secondary" fill="Soft" onClick={openDiff}>
          <Text size="B300">Review</Text>
        </Button>
      </div>
      <div className={css.FileList}>
        {summary.files.map((file) => {
          const label = fileLabel(file.path);
          return (
            <div className={css.FileRow} key={file.path}>
              <div className={css.FilePath} title={label}>
                {label}
              </div>
              <div className={css.FileMeta}>
                <DiffLineCount added={file.added} deleted={file.deleted} />
              </div>
            </div>
          );
        })}
      </div>
    </Box>
  );
}
