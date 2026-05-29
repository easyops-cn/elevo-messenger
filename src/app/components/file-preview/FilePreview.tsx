import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { Box, Icons, Spinner, Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import { platform } from '@tauri-apps/plugin-os';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { PdfViewer } from '../Pdf-viewer/PdfViewer';
import { TextViewer } from '../text-viewer';
import { saveFile } from '../../utils/file-saver';
import { FolderOpenIcon } from '../../icons/FolderOpenIcon';
import { BaseAudioViewer } from './BaseAudioViewer';
import { BaseImageViewer } from './BaseImageViewer';
import { BaseUnknownFileViewer } from './BaseUnknownFileViewer';
import { BaseVideoViewer } from './BaseVideoViewer';
import type {
  FilePreviewDownloadAction,
  FilePreviewDownloadActionKind,
  FilePreviewItem,
} from './types';

type LoadedPreview =
  | { type: 'blob-url'; src: string }
  | { type: 'text'; text: string }
  | { type: 'none' };

export type FilePreviewProps = {
  item: FilePreviewItem;
  hideCloseButton?: boolean;
  downloadAction?: FilePreviewDownloadActionKind;
  requestClose: () => void;
};

export const FilePreview = as<'div', FilePreviewProps>(
  ({ className, item, hideCloseButton, downloadAction, requestClose, ...props }, ref) => {
    const { t } = useTranslation();
    const [loaded, setLoaded] = useState<LoadedPreview>({ type: 'none' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const loadPreview = useCallback(async () => {
      setLoading(true);
      setError(false);
      const blob = await item.loadBlob();
      if (item.viewerType === 'text') {
        return { type: 'text', text: await blob.text() } as const;
      }
      return { type: 'blob-url', src: URL.createObjectURL(blob) } as const;
    }, [item]);

    const download = useCallback(async () => {
      setDownloading(true);
      try {
        if (downloadAction === 'open-folder') {
          if (!item.loadFilePath) {
            throw new Error('File path loading is required for the open-folder action.');
          }
          const filePath = await item.loadFilePath();
          await revealItemInDir(filePath);
          return;
        }

        const blob = await item.loadBlob();
        await saveFile(blob, item.name);
      } finally {
        setDownloading(false);
      }
    }, [item, downloadAction]);

    const openFolderLabelKey =
      platform() === 'macos' ? 'viewer.showInFinder' : 'viewer.openContainingFolder';
    const actionLabel =
      downloadAction === 'open-folder' ? t(openFolderLabelKey) : t('viewer.download');
    const actionIcon = downloadAction === 'open-folder' ? FolderOpenIcon : Icons.Download;
    const viewerDownloadAction: FilePreviewDownloadAction = {
      label: actionLabel,
      icon: actionIcon,
      onClick: download,
    };

    useEffect(() => {
      let alive = true;
      let objectUrl: string | undefined;

      setLoaded({ type: 'none' });
      setError(false);

      if (item.viewerType === 'file' || item.viewerType === 'audio') return undefined;

      const load = async () => {
        try {
          const result = await loadPreview();
          if (!alive) {
            if (result.type === 'blob-url') URL.revokeObjectURL(result.src);
            return;
          }
          if (result.type === 'blob-url') objectUrl = result.src;
          setLoaded(result);
        } catch {
          if (alive) setError(true);
        } finally {
          if (alive) setLoading(false);
        }
      };

      load();

      return () => {
        alive = false;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }, [item, loadPreview]);

    useEffect(() => {
      if (loaded.type !== 'blob-url') return undefined;
      const { src } = loaded;
      return () => URL.revokeObjectURL(src);
    }, [loaded]);

    if (error) {
      return (
        <Box
          className={classNames(className)}
          tabIndex={-1}
          grow="Yes"
          alignItems="Center"
          justifyContent="Center"
          {...props}
          ref={ref}
        >
          <Text>{t('viewer.failedLoadPreview')}</Text>
        </Box>
      );
    }

    if (item.viewerType === 'file') {
      return (
        <BaseUnknownFileViewer
          className={className}
          name={item.name}
          size={item.size}
          mimeType={item.mimeType}
          duration={item.duration}
          hideCloseButton={hideCloseButton}
          downloading={downloading}
          requestClose={requestClose}
          downloadAction={viewerDownloadAction}
          {...props}
          ref={ref}
        />
      );
    }

    if (item.viewerType === 'audio') {
      const src = loaded.type === 'blob-url' ? loaded.src : null;
      return (
        <BaseAudioViewer
          className={className}
          name={item.name}
          mimeType={item.mimeType}
          info={{ duration: item.duration, size: item.size }}
          waveform={item.waveform}
          src={src}
          loading={loading}
          downloading={downloading}
          hideCloseButton={hideCloseButton}
          requestClose={requestClose}
          downloadAction={viewerDownloadAction}
          onPlayClick={() => {
            if (!loading && loaded.type === 'none') {
              loadPreview()
                .then((result) => setLoaded(result))
                .catch(() => setError(true))
                .finally(() => setLoading(false));
            }
          }}
          {...props}
          ref={ref}
        />
      );
    }

    if (item.viewerType === 'text' && loaded.type === 'text') {
      return (
        <TextViewer
          className={className}
          name={item.name}
          text={loaded.text}
          langName={item.langName ?? 'txt'}
          mimeType={item.mimeType}
          hideCloseButton={hideCloseButton}
          requestClose={requestClose}
          downloadAction={viewerDownloadAction}
          {...props}
          ref={ref}
        />
      );
    }

    if (loaded.type !== 'blob-url') {
      return (
        <Box
          className={classNames(className)}
          tabIndex={-1}
          grow="Yes"
          alignItems="Center"
          justifyContent="Center"
          {...props}
          ref={ref}
        >
          <Spinner variant="Secondary" size="600" />
        </Box>
      );
    }

    if (item.viewerType === 'image') {
      return (
        <BaseImageViewer
          className={className}
          src={loaded.src}
          alt={item.name}
          hideCloseButton={hideCloseButton}
          requestClose={requestClose}
          downloadAction={viewerDownloadAction}
          {...props}
          ref={ref}
        />
      );
    }

    if (item.viewerType === 'video') {
      return (
        <BaseVideoViewer
          className={className}
          name={item.name}
          src={loaded.src}
          hideCloseButton={hideCloseButton}
          requestClose={requestClose}
          downloadAction={viewerDownloadAction}
          {...props}
          ref={ref}
        />
      );
    }

    if (item.viewerType === 'pdf') {
      return (
        <PdfViewer
          className={className}
          name={item.name}
          src={loaded.src}
          hideCloseButton={hideCloseButton}
          requestClose={requestClose}
          downloadAction={viewerDownloadAction}
          {...props}
          ref={ref}
        />
      );
    }

    return (
      <BaseUnknownFileViewer
        className={className}
        name={item.name}
        size={item.size}
        mimeType={item.mimeType}
        duration={item.duration}
        hideCloseButton={hideCloseButton}
        downloading={downloading}
        requestClose={requestClose}
        downloadAction={viewerDownloadAction}
        {...props}
        ref={ref}
      />
    );
  },
);
