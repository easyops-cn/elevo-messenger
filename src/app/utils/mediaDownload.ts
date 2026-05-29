import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { loadCachedMediaBlob, loadCachedMediaFilePath, loadCachedMediaUrl } from './mediaCache';

export const loadMediaBlob = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
): Promise<Blob> =>
  loadCachedMediaBlob({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
  });

export const loadMediaBlobUrl = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
): Promise<string> =>
  loadCachedMediaUrl({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
  });

export const loadMediaFilePath = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
): Promise<string> =>
  loadCachedMediaFilePath({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
  });
