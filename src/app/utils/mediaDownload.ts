import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import type { MatrixClient } from 'matrix-js-sdk';
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
  mx?: MatrixClient,
): Promise<Blob> =>
  loadCachedMediaBlob({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
    cacheScope,
    mx,
  });

export const loadMediaBlobUrl = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
  cacheScope?: CachedMediaRequest['cacheScope'],
  mx?: MatrixClient,
): Promise<string> =>
  loadCachedMediaUrl({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
    cacheScope,
    mx,
  });

export const loadMediaFilePath = async (
  mediaUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo,
  createdAt?: number,
  cacheScope?: CachedMediaRequest['cacheScope'],
  mx?: MatrixClient,
): Promise<string> =>
  loadCachedMediaFilePath({
    mediaUrl,
    mimeType,
    encInfo,
    createdAt,
    cacheScope,
    mx,
  });
