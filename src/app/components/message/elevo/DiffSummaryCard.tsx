import React, { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Icon, Text } from 'folds';
import * as css from './DiffSummaryCard.css';
import { type DiffSummary, UNKNOWN_FILE } from './diffSummary';
import { FileDiffIcon } from '../../../icons/FileDiffIcon';
import { CompactPath } from '../../path/CompactPath';
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
  summary: DiffSummary;
  style?: CSSProperties;
};

export function DiffSummaryCard({ summary, style }: DiffSummaryCardProps) {
  const { t } = useTranslation();
  const openCodeView = useOpenCodeView();

  const fileLabel = (path: string) => (path === UNKNOWN_FILE ? t('message.diffUnknownFile') : path);
  const totalFiles = summary.totalFiles ?? summary.files.length;
  const title =
    totalFiles === 1
      ? t('message.diffEditedOneFile', { path: fileLabel(summary.files[0].path) })
      : t('message.diffEditedFiles', { count: totalFiles });

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
              <CompactPath className={css.FilePath} path={label} />
              <div className={css.FileMeta}>
                {file.patchOmitted && (
                  <Text as="span" size="B300" priority="300">
                    {t('message.diffPatchOmitted')}
                  </Text>
                )}
                <DiffLineCount added={file.added} deleted={file.deleted} />
              </div>
            </div>
          );
        })}
        {summary.remainingFiles && summary.remainingFiles.length > 0 && (
          <div className={css.FileRow}>
            <div className={css.FilePath}>
              {t('message.diffAdditionalFiles', { count: summary.remainingFiles.length })}
            </div>
            <div className={css.FileMeta}>
              {summary.truncated && (
                <Text as="span" size="B300" priority="300">
                  {t('message.diffTruncated')}
                </Text>
              )}
            </div>
          </div>
        )}
      </div>
    </Box>
  );
}
