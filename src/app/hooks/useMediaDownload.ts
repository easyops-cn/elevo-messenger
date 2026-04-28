import { useCallback } from 'react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useAsyncCallback } from './useAsyncCallback';
import { useMatrixClient } from './useMatrixClient';
import { useMediaAuthentication } from './useMediaAuthentication';
import { saveFile } from '../utils/file-saver';
import { decryptFile, downloadEncryptedMedia, downloadMedia, mxcUrlToHttp } from '../utils/matrix';

export const useMediaDownload = (
  url: string,
  mimeType: string,
  fileName: string,
  encInfo?: EncryptedAttachmentInfo
) => {
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();

  return useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuth);
      if (!mediaUrl) throw new Error('Invalid media URL');

      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) => decryptFile(encBuf, mimeType, encInfo))
        : await downloadMedia(mediaUrl);

      await saveFile(fileContent, fileName);
    }, [mx, url, useAuth, mimeType, encInfo, fileName])
  );
};
