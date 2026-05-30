import { ReactNode, useCallback, useEffect } from 'react';
import { IThumbnailContent } from '../../../../types/matrix/common';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { FALLBACK_MIMETYPE } from '../../../utils/mimeTypes';
import { loadMediaBlobUrl } from '../../../utils/mediaDownload';
import { NO_SERVICE_WORKER } from '../../../utils/noServiceWorker';
import { isDesktopTauri } from '../../../plugins/useTauriOpener';

export type ThumbnailContentProps = {
  info: IThumbnailContent;
  createdAt?: number;
  renderImage: (src: string) => ReactNode;
};
export function ThumbnailContent({ info, createdAt, renderImage }: ThumbnailContentProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [thumbSrcState, loadThumbSrc] = useAsyncCallback(
    useCallback(async () => {
      const thumbInfo = info.thumbnail_info;
      const thumbMxcUrl = info.thumbnail_file?.url ?? info.thumbnail_url;
      const encInfo = info.thumbnail_file;
      if (typeof thumbMxcUrl !== 'string' || typeof thumbInfo?.mimetype !== 'string') {
        throw new Error('Failed to load thumbnail');
      }

      const mediaUrl = mxcUrlToHttp(mx, thumbMxcUrl, useAuthentication);
      if (!mediaUrl) throw new Error('Invalid media URL');
      if (!encInfo && !NO_SERVICE_WORKER && !isDesktopTauri) return mediaUrl;
      return loadMediaBlobUrl(
        mediaUrl,
        thumbInfo.mimetype ?? FALLBACK_MIMETYPE,
        encInfo,
        createdAt,
      );
    }, [mx, info, useAuthentication, createdAt]),
  );

  useEffect(() => {
    loadThumbSrc();
  }, [loadThumbSrc]);

  return thumbSrcState.status === AsyncStatus.Success ? renderImage(thumbSrcState.data) : null;
}
