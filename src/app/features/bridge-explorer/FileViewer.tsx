import React, { useCallback, useEffect, useState } from 'react';
import { Box, Chip, Icon, Icons, IconButton, Scroll, Spinner, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { saveFile } from '../../utils/file-saver';
import { ShikiCode } from '../../plugins/shiki';
import { fetchFileContent, fetchFileDownload, fetchFileMetadata } from './api';
import { useBridgeExplorer } from './BridgeExplorerContext';
import { InlineError, useErrorMessage } from './InlineError';
import type { FileContentResult, FileMetadata } from './types';
import * as css from './BridgeExplorer.css';

type FileViewerProps = {
  path: string | null;
};

const basename = (path: string): string => path.split('/').pop() ?? path;

export function FileViewer({ path }: FileViewerProps) {
  const { t } = useTranslation();
  const { baseUrl, workspaceId } = useBridgeExplorer();
  const toMessage = useErrorMessage();

  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [content, setContent] = useState<FileContentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [downloading, setDownloading] = useState(false);

  // Keep error mapping out of `load`/`handleDownload` deps: `t` changes once
  // after i18n finishes loading async, which would re-fire the load effect and
  // trigger a duplicate request. Store the raw error and map at render time.
  const load = useCallback(() => {
    if (!path) return;
    setLoading(true);
    setError(null);
    setContent(null);
    setMetadata(null);
    fetchFileMetadata(baseUrl, workspaceId, path)
      .then(async (meta) => {
        setMetadata(meta);
        if (meta.canReadContent === false || meta.classification === 'binary') {
          return;
        }
        const result = await fetchFileContent(baseUrl, workspaceId, path);
        setContent(result);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [baseUrl, workspaceId, path]);

  useEffect(() => {
    load();
  }, [load]);

  // Revoke media object URLs when content changes / unmounts.
  useEffect(
    () => () => {
      if (content?.kind === 'media') URL.revokeObjectURL(content.url);
    },
    [content],
  );

  const handleDownload = useCallback(() => {
    if (!path) return;
    setDownloading(true);
    fetchFileDownload(baseUrl, workspaceId, path)
      .then((blob) => saveFile(blob, basename(path)))
      .catch(setError)
      .finally(() => setDownloading(false));
  }, [baseUrl, workspaceId, path]);

  if (!path) {
    return (
      <Box
        className={css.Centered}
        direction="Column"
        justifyContent="Center"
        alignItems="Center"
        gap="200"
      >
        <Icon size="600" src={Icons.File} />
        <Text size="T300" priority="300">
          {t('bridgeExplorer.selectFile')}
        </Text>
      </Box>
    );
  }

  return (
    <Box className={css.Viewer} direction="Column">
      <Box className={css.Header} shrink="No" alignItems="Center">
        <Box grow="Yes" alignItems="Center" gap="100" style={{ minWidth: 0 }}>
          <Text size="T300" truncate title={path}>
            {path}
          </Text>
        </Box>
        <Box shrink="No" gap="100" alignItems="Center">
          <IconButton
            size="300"
            variant="Surface"
            radii="300"
            title={t('bridgeExplorer.download')}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Spinner size="100" variant="Secondary" />
            ) : (
              <Icon size="100" src={Icons.Download} />
            )}
          </IconButton>
        </Box>
      </Box>

      <Box className={css.ViewerContent} grow="Yes">
        {loading ? (
          <Box className={css.Centered} justifyContent="Center" alignItems="Center">
            <Spinner size="400" variant="Secondary" />
          </Box>
        ) : error ? (
          <InlineError message={toMessage(error)} onRetry={load} />
        ) : (
          <ViewerContent
            path={path}
            metadata={metadata}
            content={content}
            onDownload={handleDownload}
          />
        )}
      </Box>
    </Box>
  );
}

type ViewerContentProps = {
  path: string;
  metadata: FileMetadata | null;
  content: FileContentResult | null;
  onDownload: () => void;
};

function ViewerContent({ path, metadata, content, onDownload }: ViewerContentProps) {
  const { t } = useTranslation();

  if (content?.kind === 'text') {
    return (
      <Scroll size="300" hideTrack visibility="Hover">
        <pre className={css.Pre}>
          <ShikiCode code={content.text} path={path} showLineNumbers />
        </pre>
      </Scroll>
    );
  }

  if (content?.kind === 'media') {
    const isVideo = content.contentType.startsWith('video/');
    return (
      <Box className={css.MediaWrap} justifyContent="Center" alignItems="Center">
        {isVideo ? (
          <video className={css.MediaImage} src={content.url} controls />
        ) : (
          <img className={css.MediaImage} src={content.url} alt={basename(path)} />
        )}
      </Box>
    );
  }

  // Binary / oversized: cannot render inline, offer download.
  const reason = metadata?.contentReadError;
  return (
    <Box
      className={css.Centered}
      direction="Column"
      justifyContent="Center"
      alignItems="Center"
      gap="300"
    >
      <Icon size="600" src={Icons.File} />
      <Text size="T300" priority="300">
        {reason ?? t('bridgeExplorer.cannotPreview')}
      </Text>
      <Chip
        variant="Primary"
        radii="Pill"
        onClick={onDownload}
        before={<Icon size="100" src={Icons.Download} />}
      >
        <Text size="B300">{t('bridgeExplorer.download')}</Text>
      </Chip>
    </Box>
  );
}
