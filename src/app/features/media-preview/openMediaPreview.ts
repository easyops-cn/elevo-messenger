import { invoke } from '@tauri-apps/api/core';
import type { MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import type { IAudioInfo } from '../../../types/matrix/common';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import {
  READABLE_EXT_TO_MIME_TYPE,
  READABLE_TEXT_MIME_TYPES,
  getFileNameExt,
  mimeTypeToExt,
} from '../../utils/mimeTypes';
import { mxcUrlToHttp } from '../../utils/matrix';
import type { MediaPreviewPayload, MediaPreviewType } from './types';

export function getMediaPreviewType(mimetype: string, filename: string): MediaPreviewType {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf') return 'pdf';
  if (
    READABLE_TEXT_MIME_TYPES.includes(mimetype) ||
    READABLE_EXT_TO_MIME_TYPE[getFileNameExt(filename)]
  ) {
    return 'text';
  }
  return 'unknown';
}

export function getMediaPreviewLangName(mimetype: string, filename: string): string | undefined {
  if (READABLE_TEXT_MIME_TYPES.includes(mimetype)) return mimeTypeToExt(mimetype);
  const extType = READABLE_EXT_TO_MIME_TYPE[getFileNameExt(filename)];
  return extType ? mimeTypeToExt(extType) : undefined;
}

export function canOpenDesktopMediaPreview(): boolean {
  return isDesktopTauri;
}

export async function openDesktopMediaPreview(payload: MediaPreviewPayload): Promise<void> {
  await invoke('open_media_preview', { payload });
}

export function mediaPreviewPayloadFromEvent(
  mx: MatrixClient,
  fileEvent: MatrixEvent,
  useAuth: boolean
): MediaPreviewPayload | null {
  const content = fileEvent.getContent() ?? {};
  const name = (content.filename ?? content.body ?? 'Unnamed File') as string;
  const mimeType = (content.info?.mimetype ?? '') as string;
  const size = (content.info?.size ?? 0) as number;
  const url = (content.file?.url ?? content.url) as string | undefined;
  if (!url) return null;

  const mediaUrl = mxcUrlToHttp(mx, url, useAuth);
  if (!mediaUrl) return null;

  const info = (content.info ?? {}) as IAudioInfo;
  const waveform = Array.isArray(content['org.matrix.msc1767.audio']?.waveform)
    ? (content['org.matrix.msc1767.audio']?.waveform as number[])
    : undefined;
  const accessToken = useAuth ? mx.getAccessToken() ?? undefined : undefined;

  return {
    type: getMediaPreviewType(mimeType, name),
    name,
    mimeType,
    size,
    mediaUrl,
    accessToken,
    encInfo: content.file,
    langName: getMediaPreviewLangName(mimeType, name),
    info,
    waveform,
  };
}
