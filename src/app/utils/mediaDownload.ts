import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { decryptFile, downloadEncryptedMedia, downloadMedia } from './matrix';

export const loadMediaBlob = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo
): Promise<Blob> =>
  encInfo
    ? downloadEncryptedMedia(mediaUrl, (encBuf) => decryptFile(encBuf, mimeType, encInfo))
    : downloadMedia(mediaUrl);

export const loadMediaBlobUrl = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo
): Promise<string> => {
  const blob = await loadMediaBlob(mediaUrl, mimeType, encInfo);
  return URL.createObjectURL(blob);
};
