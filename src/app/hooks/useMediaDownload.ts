import { useCallback } from 'react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useAsyncCallback } from './useAsyncCallback';
import { useMatrixClient } from './useMatrixClient';
import { useMediaAuthentication } from './useMediaAuthentication';
import { saveFile } from '../utils/file-saver';
import { mxcUrlToHttp } from '../utils/matrix';
import { loadMediaBlob } from '../utils/mediaDownload';

export const useMediaDownload = (
  url: string,
  mimeType: string,
  fileName: string,
  encInfo?: EncryptedAttachmentInfo,
) => {
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();

  return useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuth);
      if (!mediaUrl) throw new Error('Invalid media URL');

      const fileContent = await loadMediaBlob(mediaUrl, mimeType, encInfo);

      await saveFile(fileContent, fileName);
    }, [mx, url, useAuth, mimeType, encInfo, fileName]),
  );
};
