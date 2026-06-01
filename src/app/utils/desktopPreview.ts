import { invoke } from '@tauri-apps/api/core';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { isDesktopTauri } from '../plugins/useTauriOpener';
import type { CachedMediaRequest } from './mediaCache';

export type DesktopPreviewViewerType = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'file';

export type DesktopPreviewPayload = {
  viewerType: DesktopPreviewViewerType;
  name: string;
  mimeType: string;
  size?: number;
  mediaUrl: string;
  encInfo?: EncryptedAttachmentInfo;
  waveform?: number[];
  langName?: string;
  duration?: number;
  createdAt?: number;
  cacheScope?: CachedMediaRequest['cacheScope'];
};

export const openDesktopFilePreview = async (payload: DesktopPreviewPayload): Promise<boolean> => {
  if (!isDesktopTauri) return false;

  try {
    await invoke('open_preview_window', { payload });
    return true;
  } catch (error) {
    console.error('[desktopPreview] open_preview_window failed:', error);
    return false;
  }
};
