import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Box, Chip, Icon, Icons, IconButton, Scroll, Spinner, Text } from 'folds';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { saveFile } from '../../utils/file-saver';
import { ShikiCode } from '../../plugins/shiki';
import { fetchFileContent, fetchFileDownload, fetchFileMetadata } from './api';
import { useBridgeExplorer } from './BridgeExplorerContext';
import { InlineError, useErrorMessage } from './InlineError';
import { sendSdkMessage } from './sdkBridge';
import type { FileContentResult, FileMetadata } from './types';
import * as css from './BridgeExplorer.css';

type FileViewerProps = {
  path: string | null;
};

const basename = (path: string): string => path.split('/').pop() ?? path;
const isMarkdownPath = (path: string): boolean => /\.(md|markdown|mdown|mkdn|mdx)$/i.test(path);

export function FileViewer({ path }: FileViewerProps) {
  const { t } = useTranslation();
  const { baseUrl, workspaceId, workspaceName } = useBridgeExplorer();
  const toMessage = useErrorMessage();

  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [content, setContent] = useState<FileContentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [downloading, setDownloading] = useState(false);
  const [markdownMode, setMarkdownMode] = useState<'preview' | 'code'>('preview');
  const [retryKey, setRetryKey] = useState(0);
  const showMarkdownModeToggle = Boolean(
    path && isMarkdownPath(path) && content?.kind === 'text' && !loading && !error,
  );

  // Keep error mapping out of `load`/`handleDownload` deps: `t` changes once
  // after i18n finishes loading async, which would re-fire the load effect and
  // trigger a duplicate request. Store the raw error and map at render time.
  useEffect(() => {
    if (!path) return;
    let disposed = false;
    setLoading(true);
    setError(null);
    setContent(null);
    setMetadata(null);

    fetchFileMetadata(baseUrl, workspaceId, path)
      .then(async (meta) => {
        if (disposed) return;
        setMetadata(meta);
        if (meta.canReadContent === false || meta.classification === 'binary') {
          return;
        }
        const result = await fetchFileContent(baseUrl, workspaceId, path, meta.classification);
        if (disposed) return;
        setContent(result);
      })
      .catch((e) => {
        if (!disposed) setError(e);
      })
      .finally(() => {
        if (disposed) return;
        setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [baseUrl, workspaceId, path, retryKey]);

  const retryLoad = useCallback(() => {
    setRetryKey((key) => key + 1);
  }, []);

  useEffect(() => {
    setMarkdownMode('preview');
  }, [path]);

  // Opening a file detail references it back to the host composer. Dedupe so the
  // same path only emits once; switching to another file updates the reference.
  const lastSentPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!path) return;
    if (lastSentPathRef.current === path) return;
    lastSentPathRef.current = path;
    sendSdkMessage('workspace-explorer', {
      type: 'select-file',
      file: {
        path,
        name: basename(path),
        workspaceId,
        workspaceName,
      },
    }).catch((e) => console.error('[bridge-explorer] failed to send select-file', e));
  }, [path, workspaceId, workspaceName]);

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
        <Box shrink="No" gap="200" alignItems="Center">
          {showMarkdownModeToggle && (
            <Box
              className={css.SegmentedControl}
              role="group"
              aria-label={t('bridgeExplorer.viewMode')}
            >
              <button
                className={css.SegmentedButton}
                type="button"
                aria-pressed={markdownMode === 'preview'}
                onClick={() => setMarkdownMode('preview')}
              >
                {t('bridgeExplorer.preview')}
              </button>
              <button
                className={css.SegmentedButton}
                type="button"
                aria-pressed={markdownMode === 'code'}
                onClick={() => setMarkdownMode('code')}
              >
                {t('bridgeExplorer.code')}
              </button>
            </Box>
          )}
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
          <InlineError message={toMessage(error)} onRetry={retryLoad} />
        ) : (
          <ViewerContent
            path={path}
            metadata={metadata}
            content={content}
            markdownMode={markdownMode}
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
  markdownMode: 'preview' | 'code';
  onDownload: () => void;
};

function ViewerContent({ path, metadata, content, markdownMode, onDownload }: ViewerContentProps) {
  const { t } = useTranslation();
  const isMarkdown = isMarkdownPath(path);

  const markdownHtml = useMemo(() => {
    if (!isMarkdown || content?.kind !== 'text' || markdownMode !== 'preview') {
      return '';
    }

    const parsed = marked.parse(content.text, { gfm: true, breaks: true }) as string;
    return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
  }, [content, isMarkdown, markdownMode]);

  if (content?.kind === 'text') {
    return (
      <Box className={css.TextViewer} direction="Column">
        {isMarkdown && markdownMode === 'preview' ? (
          <Scroll size="300" hideTrack visibility="Hover">
            <div
              className={css.MarkdownPreview}
              dangerouslySetInnerHTML={{ __html: markdownHtml }}
            />
          </Scroll>
        ) : (
          <Scroll size="300" hideTrack visibility="Hover">
            <pre className={css.Pre}>
              <ShikiCode code={content.text} path={path} showLineNumbers />
            </pre>
          </Scroll>
        )}
      </Box>
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
