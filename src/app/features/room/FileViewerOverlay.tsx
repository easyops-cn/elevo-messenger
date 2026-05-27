import React, { useEffect, useMemo, useState } from 'react';
import type { MatrixEvent } from 'matrix-js-sdk';
import { Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import FocusTrap from 'focus-trap-react';
import { ImageViewer } from '../../components/image-viewer/ImageViewer';
import { TextViewer } from '../../components/text-viewer/TextViewer';
import { PdfViewer } from '../../components/Pdf-viewer/PdfViewer';
import { VideoViewer } from '../../components/video-viewer/VideoViewer';
import { AudioViewer } from '../../components/audio-viewer/AudioViewer';
import { UnknownFileViewer } from '../../components/unknown-file-viewer/UnknownFileViewer';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { ModalWide } from '../../styles/Modal.css';
import { stopPropagation } from '../../utils/keyboard';
import type { IAudioInfo } from '../../../types/matrix/common';
import { READABLE_TEXT_MIME_TYPES, mimeTypeToExt } from '../../utils/mimeTypes';
import {
  decryptFile,
  downloadEncryptedMedia,
  downloadMedia,
  mxcUrlToHttp,
} from '../../utils/matrix';
import {
  canOpenDesktopMediaPreview,
  getMediaPreviewLangName,
  getMediaPreviewType,
  mediaPreviewPayloadFromEvent,
  openDesktopMediaPreview,
} from '../media-preview/openMediaPreview';

type FileViewerOverlayProps = {
  fileEvent: MatrixEvent;
  requestClose: () => void;
};

export function FileViewerOverlay({ fileEvent, requestClose }: FileViewerOverlayProps) {
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();

  const content = fileEvent.getContent() ?? {};
  const filename = (content.filename ?? content.body ?? 'Unnamed File') as string;
  const mimetype = (content.info?.mimetype ?? '') as string;
  const fileSize = (content.info?.size ?? 0) as number;
  const url = (content.file?.url ?? content.url) as string | undefined;
  const encInfo = content.file;
  const audioInfo = (content.info ?? {}) as IAudioInfo;
  const audioWaveform = Array.isArray(content['org.matrix.msc1767.audio']?.waveform)
    ? (content['org.matrix.msc1767.audio']?.waveform as number[])
    : undefined;
  const viewerType = getMediaPreviewType(mimetype, filename);

  useEffect(() => {
    if (!canOpenDesktopMediaPreview()) return;
    const payload = mediaPreviewPayloadFromEvent(mx, fileEvent, useAuth);
    if (!payload) return;
    openDesktopMediaPreview(payload).finally(requestClose);
  }, [fileEvent, mx, requestClose, useAuth]);

  const imageOrVideoUrl = useMemo(() => {
    if ((viewerType !== 'image' && viewerType !== 'video') || !url) return undefined;
    return mxcUrlToHttp(mx, url, useAuth);
  }, [viewerType, url, mx, useAuth]);

  const [textData, setTextData] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    setTextData(null);
    setPdfBlobUrl(null);

    if ((viewerType !== 'text' && viewerType !== 'pdf') || !url) return;

    let alive = true;

    const load = async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuth);
      if (!mediaUrl) return;

      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) => decryptFile(encBuf, mimetype, encInfo))
        : await downloadMedia(mediaUrl);

      if (!alive) return;

      if (viewerType === 'text') {
        const textContent = await fileContent.text();
        if (!alive) return;
        setTextData(textContent);
      } else {
        setPdfBlobUrl(URL.createObjectURL(fileContent));
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [fileEvent, viewerType, url, mx, useAuth, encInfo, mimetype]);

  // Cleanup blob URL
  useEffect(() => {
    if (pdfBlobUrl) {
      return () => URL.revokeObjectURL(pdfBlobUrl);
    }
  }, [pdfBlobUrl]);

  if (canOpenDesktopMediaPreview()) return null;

  if (viewerType === 'unknown') {
    if (!url) return null;
    return (
      <Overlay open backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: requestClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal
              className={ModalWide}
              size="500"
              onContextMenu={(evt: React.MouseEvent) => evt.stopPropagation()}
            >
              <UnknownFileViewer
                name={filename}
                size={fileSize}
                url={url}
                mimetype={mimetype}
                encInfo={encInfo}
                requestClose={requestClose}
              />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    );
  }

  const showViewer =
    viewerType === 'image' || viewerType === 'video'
      ? !!imageOrVideoUrl
      : viewerType === 'audio'
      ? !!url
      : viewerType === 'text'
      ? !!textData
      : !!pdfBlobUrl;

  return (
    <Overlay open={showViewer} backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: requestClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal
            className={ModalWide}
            size="500"
            onContextMenu={(evt: React.MouseEvent) => evt.stopPropagation()}
          >
            {viewerType === 'image' && imageOrVideoUrl && (
              <ImageViewer src={imageOrVideoUrl} alt={filename} requestClose={requestClose} />
            )}
            {viewerType === 'video' && imageOrVideoUrl && (
              <VideoViewer name={filename} src={imageOrVideoUrl} requestClose={requestClose} />
            )}
            {viewerType === 'audio' && url && (
              <AudioViewer
                name={filename}
                mimeType={mimetype}
                url={url}
                info={audioInfo}
                encInfo={encInfo}
                waveform={audioWaveform}
                requestClose={requestClose}
              />
            )}
            {viewerType === 'text' && textData !== null && (
              <TextViewer
                name={filename}
                text={textData}
                mimeType={mimetype}
                langName={
                  READABLE_TEXT_MIME_TYPES.includes(mimetype)
                    ? mimeTypeToExt(mimetype)
                    : getMediaPreviewLangName(mimetype, filename) ?? mimeTypeToExt(mimetype)
                }
                requestClose={requestClose}
              />
            )}
            {viewerType === 'pdf' && pdfBlobUrl && (
              <PdfViewer name={filename} src={pdfBlobUrl} requestClose={requestClose} />
            )}
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
