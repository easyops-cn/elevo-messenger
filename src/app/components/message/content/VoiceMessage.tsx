import React, { useCallback } from 'react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { IAudioInfo } from '../../../../types/matrix/common';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { WaveformPlayer } from '../../media/WaveformPlayer';
import { loadMediaBlobUrl } from '../../../utils/mediaDownload';

export type VoiceMessageProps = {
  mimeType: string;
  url: string;
  info: IAudioInfo;
  encInfo?: EncryptedAttachmentInfo;
  createdAt?: number;
  waveform: number[];
};

export function VoiceMessage({
  mimeType,
  url,
  info,
  encInfo,
  createdAt,
  waveform,
}: VoiceMessageProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [srcState, loadSrc] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuthentication);
      if (!mediaUrl) throw new Error('Invalid media URL');
      return loadMediaBlobUrl(mediaUrl, mimeType, encInfo, createdAt);
    }, [mx, url, useAuthentication, mimeType, encInfo, createdAt]),
  );

  const infoDuration = info.duration ?? 0;
  const durationSec = (infoDuration >= 0 ? infoDuration : 0) / 1000;

  const handlePlayClick = () => {
    loadSrc();
  };

  return (
    <WaveformPlayer
      audioSrc={srcState.status === AsyncStatus.Success ? srcState.data : null}
      waveform={waveform}
      durationSec={durationSec}
      mimeType={mimeType}
      isLoading={srcState.status === AsyncStatus.Loading}
      onPlayClick={handlePlayClick}
      autoPlay
    />
  );
}
