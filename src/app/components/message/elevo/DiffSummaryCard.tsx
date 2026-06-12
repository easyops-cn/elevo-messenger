import React, { CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Icon, Text } from 'folds';
import * as css from './DiffSummaryCard.css';
import { type DiffSummary, UNKNOWN_FILE } from './diffSummary';
import { FileDiffIcon } from '../../../icons/FileDiffIcon';
import { useOpenCodeView } from '../../../utils/codeView';
import type { CodeViewWorkspaceContext } from '../../code-view';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { fetchDiffSummary } from './diffApi';

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
  codeViewWorkspace?: CodeViewWorkspaceContext;
  style?: CSSProperties;
};

export function DiffSummaryCard({ summary, codeViewWorkspace, style }: DiffSummaryCardProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const openCodeView = useOpenCodeView();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fileLabel = (path: string) => (path === UNKNOWN_FILE ? t('message.diffUnknownFile') : path);
  const totalFiles = summary.totalFiles ?? summary.files.length;
  const title = t('message.diffEditedFile', { count: totalFiles });

  const openDiff = async () => {
    setError(undefined);
    setLoading(true);
    try {
      const codeViewSummary = summary.diffRef
        ? await fetchDiffSummary(mx, summary.diffRef.bridgeId, summary.diffRef.diffPath)
        : summary;

      await openCodeView({
        title,
        files: codeViewSummary.files,
        added: codeViewSummary.added,
        deleted: codeViewSummary.deleted,
        ...codeViewWorkspace,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('message.diffLoadError'));
    } finally {
      setLoading(false);
    }
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
        <Button
          className={css.ReviewButton}
          size="300"
          radii="300"
          variant="Secondary"
          fill="Soft"
          onClick={openDiff}
          disabled={loading}
        >
          <Text size="B300">{loading ? t('message.diffLoading') : 'Review'}</Text>
        </Button>
      </div>
      {error && (
        <Text size="B300" priority="300">
          {t('message.diffLoadError')} {error}
        </Text>
      )}
      <div className={css.FileList}>
        {summary.files.map((file) => {
          const label = fileLabel(file.path);
          return (
            <div className={css.FileRow} key={file.path}>
              <div className={css.FilePath} title={label}>
                {label}
              </div>
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
