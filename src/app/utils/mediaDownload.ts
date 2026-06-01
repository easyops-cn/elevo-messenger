import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import {
  CachedMediaRequest,
  loadCachedMediaBlob,
  loadCachedMediaFilePath,
  loadCachedMediaUrl,
} from './mediaCache';

export const loadMediaBlob = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
  cacheScope?: CachedMediaRequest['cacheScope'],
): Promise<Blob> =>
  loadCachedMediaBlob({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
    cacheScope,
  });

export const loadMediaBlobUrl = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
  cacheScope?: CachedMediaRequest['cacheScope'],
): Promise<string> =>
  loadCachedMediaUrl({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
    cacheScope,
  });

export const loadMediaFilePath = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
  cacheScope?: CachedMediaRequest['cacheScope'],
): Promise<string> =>
  loadCachedMediaFilePath({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
    cacheScope,
  });
