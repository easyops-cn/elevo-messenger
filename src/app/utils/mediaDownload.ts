import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { loadCachedMediaBlob, loadCachedMediaFilePath, loadCachedMediaUrl } from './mediaCache';

export const loadMediaBlob = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
): Promise<Blob> =>
  loadCachedMediaBlob({
    mediaUrl,
    mimeType,
    encInfo,
  });

export const loadMediaBlobUrl = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
): Promise<string> =>
  loadCachedMediaUrl({
    mediaUrl,
    mimeType,
    encInfo,
  });

export const loadMediaFilePath = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
): Promise<string> =>
  loadCachedMediaFilePath({
    mediaUrl,
    mimeType,
    encInfo,
  });
