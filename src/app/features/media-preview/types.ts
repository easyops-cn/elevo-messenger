import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import type { IAudioInfo } from '../../../types/matrix/common';

export type MediaPreviewType = 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'unknown';

export type MediaPreviewPayload = {
  type: MediaPreviewType;
  name: string;
  mimeType: string;
  size?: number;
  mediaUrl?: string;
  accessToken?: string;
  encInfo?: EncryptedAttachmentInfo;
  text?: string;
  langName?: string;
  info?: IAudioInfo;
  waveform?: number[];
};

declare global {
  interface Window {
    __ElevoMediaPreview_initialPayload__?: MediaPreviewPayload;
    __ElevoMediaPreview_initialTheme__?: string;
    __ElevoMediaPreview_receive__?: (payload: MediaPreviewPayload) => void;
    __ElevoMediaPreview_theme__?: (themeKind: string) => void;
  }
}
