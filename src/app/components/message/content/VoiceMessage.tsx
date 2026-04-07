import React, { useCallback } from 'react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { IAudioInfo } from '../../../../types/matrix/common';
import {
  decryptFile,
  downloadEncryptedMedia,
  downloadMedia,
  mxcUrlToHttp,
} from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { WaveformPlayer } from '../../media/WaveformPlayer';

export type VoiceMessageProps = {
  mimeType: string;
  url: string;
  info: IAudioInfo;
  encInfo?: EncryptedAttachmentInfo;
  waveform: number[];
};

export function VoiceMessage({
  mimeType,
  url,
  info,
  encInfo,
  waveform,
}: VoiceMessageProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [srcState, loadSrc] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuthentication);
      if (!mediaUrl) throw new Error('Invalid media URL');
      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) => decryptFile(encBuf, mimeType, encInfo))
        : await downloadMedia(mediaUrl);
      return URL.createObjectURL(fileContent);
    }, [mx, url, useAuthentication, mimeType, encInfo])
  );

  const infoDuration = info.duration ?? 0;
  const durationSec = (infoDuration >= 0 ? infoDuration : 0) / 1000;

  return (
    <WaveformPlayer
      audioSrc={srcState.status === AsyncStatus.Success ? srcState.data : null}
      waveform={waveform}
      durationSec={durationSec}
      mimeType={mimeType}
      isLoading={srcState.status === AsyncStatus.Loading}
      onPlayClick={loadSrc}
      autoPlay
    />
  );
}
