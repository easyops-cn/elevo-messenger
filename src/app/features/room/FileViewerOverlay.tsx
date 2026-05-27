import React, { useCallback, useEffect, useMemo } from 'react';
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
import { openDesktopFilePreview, type DesktopPreviewViewerType } from '../../utils/desktopPreview';

type ViewerType = 'image' | 'video' | 'audio' | 'text' | 'pdf';

type FileViewerOverlayProps = {
  fileEvent: MatrixEvent;
  requestClose: () => void;
};

function getFileType(mimetype: string, filename: string): ViewerType | null {
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

export function FileViewerOverlay({ fileEvent, requestClose }: FileViewerOverlayProps) {
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();

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

  useEffect(() => {
    if (!mediaUrl || !previewItem) return;
    const open = async () => {
      const opened = await openDesktopFilePreview({
        viewerType: previewItem.viewerType,
        name: previewItem.name,
        mimeType: previewItem.mimeType,
        size: previewItem.size,
        duration: previewItem.duration,
        mediaUrl,
        encInfo,
        waveform: previewItem.waveform,
        langName: previewItem.langName,
      });
      if (opened) requestClose();
    };
    open();
  }, [encInfo, mediaUrl, previewItem, requestClose]);

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
