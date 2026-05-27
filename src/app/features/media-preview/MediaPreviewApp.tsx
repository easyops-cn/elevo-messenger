/* eslint-disable no-use-before-define */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Header, Icon, IconButton, Icons, Spinner, Text, config } from 'folds';
import { useTranslation } from 'react-i18next';
import { ImageViewer } from '../../components/image-viewer';
import { VideoViewer } from '../../components/video-viewer/VideoViewer';
import { TextViewer } from '../../components/text-viewer/TextViewer';
import { PdfViewer } from '../../components/Pdf-viewer/PdfViewer';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { decryptFile, downloadEncryptedMedia, downloadMedia } from '../../utils/matrix';
import { saveFile } from '../../utils/file-saver';
import { bytesToSize, getFileTypeIcon } from '../../utils/common';
import { PreviewAudio } from './PreviewAudio';
import type { MediaPreviewPayload } from './types';
import * as css from './MediaPreviewApp.css';

type LoadedPreview =
  | { type: 'image' | 'video' | 'pdf' | 'audio'; src: string }
  | { type: 'text'; text: string };

function missingPayload(): MediaPreviewPayload {
  return {
    type: 'unknown',
    name: 'Preview',
    mimeType: 'application/octet-stream',
  };
}

async function loadPreviewBlob(payload: MediaPreviewPayload): Promise<Blob> {
  if (!payload.mediaUrl) throw new Error('Missing media URL');
  if (payload.encInfo) {
    const { encInfo } = payload;
    return downloadEncryptedMedia(
      payload.mediaUrl,
      (encBuf) => decryptFile(encBuf, payload.mimeType, encInfo),
      payload.accessToken
    );
  }
  return downloadMedia(payload.mediaUrl, payload.accessToken);
}

export function MediaPreviewApp() {
  const { t } = useTranslation();
  const [payload, setPayload] = useState<MediaPreviewPayload>(
    window.__ElevoMediaPreview_initialPayload__ ?? missingPayload()
  );

  useEffect(() => {
    window.__ElevoMediaPreview_receive__ = (nextPayload) => {
      setPayload(nextPayload);
      document.title = nextPayload.name || 'Preview';
    };
    document.title = payload.name || 'Preview';
    return () => {
      delete window.__ElevoMediaPreview_receive__;
    };
  }, [payload.name]);

  const [loadState, load] = useAsyncCallback(
    useCallback(async (): Promise<LoadedPreview | null> => {
      if (payload.type === 'unknown') return null;
      if (payload.type === 'text' && typeof payload.text === 'string') {
        return { type: 'text', text: payload.text };
      }
      const blob = await loadPreviewBlob(payload);
      if (payload.type === 'text') {
        return { type: 'text', text: await blob.text() };
      }
      return { type: payload.type, src: URL.createObjectURL(blob) };
    }, [payload])
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (
      loadState.status !== AsyncStatus.Success ||
      !loadState.data ||
      loadState.data.type === 'text'
    ) {
      return undefined;
    }
    const { src } = loadState.data;
    return () => URL.revokeObjectURL(src);
  }, [loadState]);

  const requestClose = useCallback(() => {
    window.close();
  }, []);

  const downloadCurrent = useCallback(async () => {
    const blob = await loadPreviewBlob(payload);
    await saveFile(blob, payload.name);
  }, [payload]);

  const audioSrcLoader = useMemo(
    () => async () => {
      const blob = await loadPreviewBlob(payload);
      return URL.createObjectURL(blob);
    },
    [payload]
  );

  if (payload.type === 'unknown') {
    return (
      <Box className={css.Root}>
        <PreviewFileShell
          className={css.Viewer}
          name={payload.name}
          size={payload.size ?? 0}
          mimeType={payload.mimeType}
          requestClose={requestClose}
          onDownload={downloadCurrent}
        />
      </Box>
    );
  }

  if (loadState.status === AsyncStatus.Loading || loadState.status === AsyncStatus.Idle) {
    return (
      <Box className={css.Root}>
        <Box className={css.Center} direction="Column" gap="200">
          <Spinner variant="Secondary" />
          <Text size="T200">{t('common.loading')}</Text>
        </Box>
      </Box>
    );
  }

  if (loadState.status === AsyncStatus.Error || !loadState.data) {
    return (
      <Box className={css.Root}>
        <Box className={css.Center}>
          <Text size="T300">Failed to load preview.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={css.Root}>
      {loadState.data.type === 'image' && (
        <ImageViewer
          className={css.Viewer}
          src={loadState.data.src}
          alt={payload.name}
          requestClose={requestClose}
        />
      )}
      {loadState.data.type === 'video' && (
        <VideoViewer
          className={css.Viewer}
          name={payload.name}
          src={loadState.data.src}
          requestClose={requestClose}
        />
      )}
      {loadState.data.type === 'audio' && (
        <PreviewFileShell
          className={css.Viewer}
          name={payload.name}
          size={payload.size ?? 0}
          mimeType={payload.mimeType}
          requestClose={requestClose}
          onDownload={downloadCurrent}
        >
          <Box style={{ width: 'min(520px, 100%)' }}>
            <PreviewAudio
              mimeType={payload.mimeType}
              info={payload.info}
              waveform={payload.waveform}
              loadSrc={audioSrcLoader}
            />
          </Box>
        </PreviewFileShell>
      )}
      {loadState.data.type === 'text' && (
        <TextViewer
          className={css.Viewer}
          name={payload.name}
          text={loadState.data.text}
          langName={payload.langName ?? 'txt'}
          mimeType={payload.mimeType}
          requestClose={requestClose}
        />
      )}
      {loadState.data.type === 'pdf' && (
        <PdfViewer
          className={css.Viewer}
          name={payload.name}
          src={loadState.data.src}
          requestClose={requestClose}
        />
      )}
    </Box>
  );
}

type PreviewFileShellProps = {
  className?: string;
  name: string;
  size: number;
  mimeType: string;
  requestClose: () => void;
  onDownload: () => Promise<void>;
  children?: React.ReactNode;
};

function PreviewFileShell({
  className,
  name,
  size,
  mimeType,
  requestClose,
  onDownload,
  children,
}: PreviewFileShellProps) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  }, [onDownload]);

  return (
    <Box className={className} direction="Column">
      <Header size="400">
        <Box grow="Yes" alignItems="Center" gap="200">
          <IconButton size="300" radii="300" onClick={requestClose}>
            <Icon size="50" src={Icons.ArrowLeft} />
          </IconButton>
          <Text size="T300" truncate>
            {name}
          </Text>
        </Box>
      </Header>
      <Box grow="Yes" direction="Column" alignItems="Center" justifyContent="Center" gap="200">
        <Icon size="600" src={getFileTypeIcon(mimeType, true)} />
        <Text size="T200" priority="300" truncate>
          {name}
        </Text>
        <Text size="T200" priority="300">
          {bytesToSize(size)}
        </Text>
        {children ?? <Text size="T300">{t('viewer.noPreview')}</Text>}
        <Button
          variant="Primary"
          fill="Solid"
          size="400"
          radii="300"
          onClick={handleDownload}
          disabled={downloading}
          before={downloading ? <Spinner size="100" /> : <Icon size="200" src={Icons.Download} />}
          style={{ marginTop: config.space.S400 }}
        >
          <Text size="T300">{t('viewer.download')}</Text>
        </Button>
      </Box>
    </Box>
  );
}
