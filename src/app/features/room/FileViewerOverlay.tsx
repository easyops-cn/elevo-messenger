import React, { useCallback, useMemo } from 'react';
import type { MatrixEvent } from 'matrix-js-sdk';
import { Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import FocusTrap from 'focus-trap-react';
import { FilePreview, type FilePreviewItem } from '../../components/file-preview';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { ModalWide } from '../../styles/Modal.css';
import { stopPropagation } from '../../utils/keyboard';
import type { IAudioInfo } from '../../../types/matrix/common';
import {
  READABLE_TEXT_MIME_TYPES,
  READABLE_EXT_TO_MIME_TYPE,
  getFileNameExt,
  mimeTypeToExt,
} from '../../utils/mimeTypes';
import {
  decryptFile,
  downloadEncryptedMedia,
  downloadMedia,
  mxcUrlToHttp,
} from '../../utils/matrix';
import {
  getRoomMediaAudioInfo,
  getRoomMediaEncryptedInfo,
  type RoomMediaEntry,
} from '../../utils/roomMediaIndex';
import {
  type DesktopPreviewPayload,
  type DesktopPreviewViewerType,
} from '../../utils/desktopPreview';

type ViewerType = 'image' | 'video' | 'audio' | 'text' | 'pdf';

type FileViewerOverlayProps = {
  fileEvent: MatrixEvent;
  requestClose: () => void;
};

type RoomMediaViewerOverlayProps = {
  file: RoomMediaEntry;
  mediaUrl: string;
  requestClose: () => void;
};

export function getFileType(mimetype: string, filename: string): ViewerType | null {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf') return 'pdf';
  if (
    READABLE_TEXT_MIME_TYPES.includes(mimetype) ||
    READABLE_EXT_TO_MIME_TYPE[getFileNameExt(filename)]
  ) {
    return 'text';
  }
  return null;
}

export const getFileViewerInfo = (fileEvent: MatrixEvent) => {
  const content = fileEvent.getContent() ?? {};
  const filename = (content['org.matrix.msc1767.file']?.name ??
    content.filename ??
    content.body ??
    'Unnamed File') as string;
  const mimetype = (content.info?.mimetype ?? '') as string;
  const fileSize = (content.info?.size ?? 0) as number;
  const url = (content.file?.url ?? content.url) as string | undefined;
  const encInfo = content.file;
  const audioInfo = (content.info ?? {}) as IAudioInfo;
  const audioWaveform = Array.isArray(content['org.matrix.msc1767.audio']?.waveform)
    ? (content['org.matrix.msc1767.audio']?.waveform as number[])
    : undefined;
  const viewerType = getFileType(mimetype, filename);
  const desktopViewerType: DesktopPreviewViewerType = viewerType ?? 'file';

  return {
    filename,
    mimetype,
    fileSize,
    url,
    encInfo,
    audioInfo,
    audioWaveform,
    viewerType,
    desktopViewerType,
  };
};

export const getRoomMediaViewerInfo = (entry: RoomMediaEntry) => {
  const msc1767Audio = entry.content['org.matrix.msc1767.audio'];
  const filename = entry.filename;
  const mimetype = entry.mimeType;
  const fileSize = entry.size;
  const url = entry.mediaMxc;
  const encInfo = getRoomMediaEncryptedInfo(entry);
  const audioInfo = getRoomMediaAudioInfo(entry);
  const audioWaveform =
    msc1767Audio && typeof msc1767Audio === 'object' && 'waveform' in msc1767Audio
      ? Array.isArray(msc1767Audio.waveform)
        ? (msc1767Audio.waveform as number[])
        : undefined
      : undefined;
  const viewerType = getFileType(mimetype, filename);
  const desktopViewerType: DesktopPreviewViewerType = viewerType ?? 'file';

  return {
    filename,
    mimetype,
    fileSize,
    url,
    encInfo,
    audioInfo,
    audioWaveform,
    viewerType,
    desktopViewerType,
  };
};

export const createDesktopPreviewPayloadFromEntry = (
  entry: RoomMediaEntry,
  mediaUrl: string,
): DesktopPreviewPayload => {
  const {
    filename,
    mimetype,
    fileSize,
    encInfo,
    audioInfo,
    audioWaveform,
    viewerType,
    desktopViewerType,
  } = getRoomMediaViewerInfo(entry);

  return {
    viewerType: desktopViewerType,
    name: filename,
    mimeType: mimetype,
    size: fileSize,
    createdAt: entry.eventTs,
    duration: audioInfo.duration,
    mediaUrl,
    encInfo,
    waveform: audioWaveform,
    langName:
      viewerType === 'text'
        ? READABLE_TEXT_MIME_TYPES.includes(mimetype)
          ? mimeTypeToExt(mimetype)
          : mimeTypeToExt(READABLE_EXT_TO_MIME_TYPE[getFileNameExt(filename)] ?? mimetype)
        : undefined,
  };
};

export const createDesktopPreviewPayload = (
  fileEvent: MatrixEvent,
  mediaUrl: string,
): DesktopPreviewPayload => {
  const {
    filename,
    mimetype,
    fileSize,
    encInfo,
    audioInfo,
    audioWaveform,
    viewerType,
    desktopViewerType,
  } = getFileViewerInfo(fileEvent);

  return {
    viewerType: desktopViewerType,
    name: filename,
    mimeType: mimetype,
    size: fileSize,
    createdAt: fileEvent.getTs(),
    duration: audioInfo.duration,
    mediaUrl,
    encInfo,
    waveform: audioWaveform,
    langName:
      viewerType === 'text'
        ? READABLE_TEXT_MIME_TYPES.includes(mimetype)
          ? mimeTypeToExt(mimetype)
          : mimeTypeToExt(READABLE_EXT_TO_MIME_TYPE[getFileNameExt(filename)] ?? mimetype)
        : undefined,
  };
};

export function FileViewerOverlay({ fileEvent, requestClose }: FileViewerOverlayProps) {
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();

  const {
    filename,
    mimetype,
    fileSize,
    url,
    encInfo,
    audioInfo,
    audioWaveform,
    viewerType,
    desktopViewerType,
  } = getFileViewerInfo(fileEvent);
  const mediaUrl = useMemo(() => {
    if (!url) return undefined;
    return mxcUrlToHttp(mx, url, useAuth);
  }, [mx, url, useAuth]);
  const loadBlob = useCallback(async () => {
    if (!mediaUrl) throw new Error('Invalid media URL');
    return encInfo
      ? downloadEncryptedMedia(mediaUrl, (encBuf) => decryptFile(encBuf, mimetype, encInfo))
      : downloadMedia(mediaUrl);
  }, [encInfo, mediaUrl, mimetype]);
  const previewItem = useMemo<FilePreviewItem | undefined>(() => {
    if (!mediaUrl) return undefined;
    return {
      viewerType: desktopViewerType,
      name: filename,
      mimeType: mimetype,
      size: fileSize,
      duration: audioInfo.duration,
      waveform: audioWaveform,
      langName:
        viewerType === 'text'
          ? READABLE_TEXT_MIME_TYPES.includes(mimetype)
            ? mimeTypeToExt(mimetype)
            : mimeTypeToExt(READABLE_EXT_TO_MIME_TYPE[getFileNameExt(filename)] ?? mimetype)
          : undefined,
      loadBlob,
    };
  }, [
    audioInfo.duration,
    audioWaveform,
    desktopViewerType,
    fileSize,
    filename,
    loadBlob,
    mediaUrl,
    mimetype,
    viewerType,
  ]);

  if (!previewItem) return null;

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            fallbackFocus: '[data-file-viewer-overlay]',
            onDeactivate: requestClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal
            data-file-viewer-overlay
            tabIndex={-1}
            className={ModalWide}
            size="500"
            onContextMenu={(evt: React.MouseEvent) => evt.stopPropagation()}
          >
            <FilePreview item={previewItem} requestClose={requestClose} />
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

export function RoomMediaViewerOverlay({
  file,
  mediaUrl,
  requestClose,
}: RoomMediaViewerOverlayProps) {
  const {
    filename,
    mimetype,
    fileSize,
    encInfo,
    audioInfo,
    audioWaveform,
    viewerType,
    desktopViewerType,
  } = getRoomMediaViewerInfo(file);
  const loadBlob = useCallback(async () => {
    return encInfo
      ? downloadEncryptedMedia(mediaUrl, (encBuf) => decryptFile(encBuf, mimetype, encInfo))
      : downloadMedia(mediaUrl);
  }, [encInfo, mediaUrl, mimetype]);
  const previewItem = useMemo<FilePreviewItem>(
    () => ({
      viewerType: desktopViewerType,
      name: filename,
      mimeType: mimetype,
      size: fileSize,
      duration: audioInfo.duration,
      waveform: audioWaveform,
      langName:
        viewerType === 'text'
          ? READABLE_TEXT_MIME_TYPES.includes(mimetype)
            ? mimeTypeToExt(mimetype)
            : mimeTypeToExt(READABLE_EXT_TO_MIME_TYPE[getFileNameExt(filename)] ?? mimetype)
          : undefined,
      loadBlob,
    }),
    [
      audioInfo.duration,
      audioWaveform,
      desktopViewerType,
      fileSize,
      filename,
      loadBlob,
      mimetype,
      viewerType,
    ],
  );

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            fallbackFocus: '[data-file-viewer-overlay]',
            onDeactivate: requestClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal
            data-file-viewer-overlay
            tabIndex={-1}
            className={ModalWide}
            size="500"
            onContextMenu={(evt: React.MouseEvent) => evt.stopPropagation()}
          >
            <FilePreview item={previewItem} requestClose={requestClose} />
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
