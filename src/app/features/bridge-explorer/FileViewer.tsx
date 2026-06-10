import React, { useCallback, useEffect, useState } from 'react';
import { Box, Chip, Icon, Icons, IconButton, Scroll, Spinner, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { CopyIcon } from '../../icons/CopyIcon';
import { copyToClipboard } from '../../utils/dom';
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
  const { baseUrl, workspaceId, token } = useBridgeExplorer();
  const toMessage = useErrorMessage();

  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [content, setContent] = useState<FileContentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(() => {
    if (!path) return;
    setLoading(true);
    setError(null);
    setContent(null);
    setMetadata(null);
    fetchFileMetadata(baseUrl, workspaceId, path, token)
      .then(async (meta) => {
        setMetadata(meta);
        if (meta.canReadContent === false || meta.classification === 'binary') {
          return;
        }
        const result = await fetchFileContent(baseUrl, workspaceId, path, token);
        setContent(result);
      })
      .catch((e) => setError(toMessage(e)))
      .finally(() => setLoading(false));
  }, [baseUrl, workspaceId, token, path, toMessage]);

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
    fetchFileDownload(baseUrl, workspaceId, path, token)
      .then((blob) => saveFile(blob, basename(path)))
      .catch((e) => setError(toMessage(e)))
      .finally(() => setDownloading(false));
  }, [baseUrl, workspaceId, token, path, toMessage]);

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
            title={t('bridgeExplorer.copyPath')}
            onClick={() => copyToClipboard(path)}
          >
            <Icon size="100" src={CopyIcon} />
          </IconButton>
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
          <InlineError message={error} onRetry={load} />
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
          <ShikiCode code={content.text} lang={path} />
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
