import { useCallback } from 'react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { platform } from '@tauri-apps/plugin-os';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { useAsyncCallback } from './useAsyncCallback';
import { useMatrixClient } from './useMatrixClient';
import { useMediaAuthentication } from './useMediaAuthentication';
import { saveFile } from '../utils/file-saver';
import { mxcUrlToHttp } from '../utils/matrix';
import { loadMediaBlob, loadMediaFilePath } from '../utils/mediaDownload';
import { isDesktopTauri } from '../plugins/useTauriOpener';

export type MediaDownloadActionKind = 'download' | 'open-folder';

export type MediaDownloadAction = {
  kind: MediaDownloadActionKind;
  labelKey: 'viewer.download' | 'viewer.openContainingFolder' | 'viewer.revealInFinder';
};

export const useMediaDownload = (
  url: string,
  mimeType: string,
  fileName: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
) => {
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();
  const action: MediaDownloadAction = isDesktopTauri
    ? {
        kind: 'open-folder',
        labelKey: platform() === 'macos' ? 'viewer.revealInFinder' : 'viewer.openContainingFolder',
      }
    : {
        kind: 'download',
        labelKey: 'viewer.download',
      };

  const [state, run] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuth);
      if (!mediaUrl) throw new Error('Invalid media URL');

      if (isDesktopTauri) {
        const filePath = await loadMediaFilePath(mediaUrl, mimeType, encInfo, createdAt);
        await revealItemInDir(filePath);
        return;
      }

      const fileContent = await loadMediaBlob(mediaUrl, mimeType, encInfo, createdAt);

      await saveFile(fileContent, fileName);
    }, [mx, url, useAuth, mimeType, encInfo, createdAt, fileName]),
  );

  return [state, run, action] as const;
};
