import { invoke } from '@tauri-apps/api/core';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { isDesktopTauri } from '../plugins/useTauriOpener';

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
};

export const openDesktopFilePreview = async (
  payload: DesktopPreviewPayload
): Promise<boolean> => {
  if (!isDesktopTauri) return false;

  try {
    await invoke('open_preview_window', { payload });
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[desktopPreview] open_preview_window failed:', error);
    return false;
  }
};
