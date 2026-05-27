import React, { useEffect } from 'react';
import { ImageViewer, ImageViewerProps } from '../../components/image-viewer';
import { canOpenDesktopMediaPreview, openDesktopMediaPreview } from './openMediaPreview';

type DesktopImageViewerProps = ImageViewerProps & {
  mimeType?: string;
};

export function DesktopImageViewer({
  src,
  alt,
  mimeType,
  requestClose,
  ...props
}: DesktopImageViewerProps) {
  useEffect(() => {
    if (!canOpenDesktopMediaPreview()) return;
    openDesktopMediaPreview({
      type: 'image',
      name: alt,
      mimeType: mimeType ?? 'image/*',
      mediaUrl: src,
    }).finally(requestClose);
  }, [alt, mimeType, requestClose, src]);

  if (canOpenDesktopMediaPreview()) return null;

  return <ImageViewer src={src} alt={alt} requestClose={requestClose} {...props} />;
}
