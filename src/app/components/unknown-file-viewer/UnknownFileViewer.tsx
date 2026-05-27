import React from 'react';
import { as } from 'folds';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useMediaDownload } from '../../hooks/useMediaDownload';
import { BaseUnknownFileViewer } from '../file-preview';

export type UnknownFileViewerProps = {
  name: string;
  size: number;
  url: string;
  mimetype: string;
  encInfo?: EncryptedAttachmentInfo;
  requestClose: () => void;
};

export const UnknownFileViewer = as<'div', UnknownFileViewerProps>(
  ({ className, name, size, url, mimetype, encInfo, requestClose, ...props }, ref) => {
    const [downloadState, handleDownload] = useMediaDownload(url, mimetype, name, encInfo);

    const downloading = downloadState.status === 'loading';

    return (
      <BaseUnknownFileViewer
        className={className}
        name={name}
        size={size}
        mimeType={mimetype}
        downloading={downloading}
        requestClose={requestClose}
        onDownload={handleDownload}
        {...props}
        ref={ref}
      />
    );
  }
);
