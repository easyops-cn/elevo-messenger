import React, { useEffect, useMemo, useState } from 'react';
import type { MatrixEvent } from 'matrix-js-sdk';
import { Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import FocusTrap from 'focus-trap-react';
import { ImageViewer } from '../../components/image-viewer/ImageViewer';
import { TextViewer } from '../../components/text-viewer/TextViewer';
import { PdfViewer } from '../../components/Pdf-viewer/PdfViewer';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { ModalWide } from '../../styles/Modal.css';
import { stopPropagation } from '../../utils/keyboard';
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

type ViewerType = 'image' | 'text' | 'pdf';

type FileViewerOverlayProps = {
  fileEvent: MatrixEvent | null;
  requestClose: () => void;
};

function getFileType(mimetype: string, filename: string): ViewerType | null {
  if (mimetype.startsWith('image/')) return 'image';
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

  const content = fileEvent?.getContent() ?? {};
  const filename = (content.filename ?? content.body ?? 'Unnamed File') as string;
  const mimetype = (content.info?.mimetype ?? '') as string;
  const url = (content.file?.url ?? content.url) as string | undefined;
  const encInfo = content.file;
  const viewerType = getFileType(mimetype, filename);

  const imageUrl = useMemo(() => {
    if (viewerType !== 'image' || !url) return undefined;
    return mxcUrlToHttp(mx, url, useAuth);
  }, [viewerType, url, mx, useAuth]);

  const [textData, setTextData] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    setTextData(null);
    setPdfBlobUrl(null);

    if (!fileEvent || !viewerType || viewerType === 'image' || !url) return;

    let alive = true;

    const load = async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuth);
      if (!mediaUrl) return;

      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) =>
            decryptFile(encBuf, mimetype, encInfo)
          )
        : await downloadMedia(mediaUrl);
      let textContent: string | null = null;
      if (viewerType === 'text') {
        textContent = await fileContent.text();
      }

      if (!alive) return;

      if (viewerType === 'text') {
        setTextData(textContent);
      } else if (viewerType === 'pdf') {
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

  if (!fileEvent || !viewerType) return null;

  const showViewer =
    viewerType === 'image'
      ? !!imageUrl
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
            onContextMenu={(evt: any) => evt.stopPropagation()}
          >
            {viewerType === 'image' && imageUrl && (
              <ImageViewer src={imageUrl} alt={filename} requestClose={requestClose} />
            )}
            {viewerType === 'text' && textData !== null && (
              <TextViewer
                name={filename}
                text={textData}
                langName={
                  READABLE_TEXT_MIME_TYPES.includes(mimetype)
                    ? mimeTypeToExt(mimetype)
                    : mimeTypeToExt(
                        READABLE_EXT_TO_MIME_TYPE[getFileNameExt(filename)] ?? mimetype
                      )
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
